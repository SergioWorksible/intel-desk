import { SupabaseClient } from '@supabase/supabase-js'
import Fuse from 'fuse.js'
import type { Database } from '@/types/database'

type Article = Database['public']['Tables']['articles']['Row']

interface ClusterResult {
  created: number
  updated: number
}

/**
 * Simple deterministic clustering algorithm
 * In production, use embeddings and vector similarity
 */
export async function clusterArticles(
  supabase: SupabaseClient<Database>
): Promise<ClusterResult> {
  const result: ClusterResult = {
    created: 0,
    updated: 0,
  }

  // Fetch unclustered articles from the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .is('cluster_id', null)
    .gte('created_at', sevenDaysAgo)
    .order('published_at', { ascending: false })
    .limit(500) as { data: Article[] | null; error: any }

  if (error) {
    console.error('Error fetching articles for clustering:', error)
    return result
  }

  if (!articles || articles.length === 0) {
    console.log('No unclustered articles found in the last 7 days')
    return result
  }

  console.log(`Processing ${articles.length} unclustered articles for clustering`)

  // Fetch existing clusters
  const { data: existingClusters } = await supabase
    .from('clusters')
    .select('*')
    .gte('window_end', sevenDaysAgo) as { data: Database['public']['Tables']['clusters']['Row'][] | null }

  // Create fuzzy search index for existing cluster titles
  const clusterFuse = existingClusters
    ? new Fuse(existingClusters, {
        keys: ['canonical_title'],
        threshold: 0.4,
        includeScore: true,
      })
    : null

  // Group articles by similarity
  const processedArticles = new Set<string>()
  const newClusters: Map<string, Article[]> = new Map()

  const articlesArray = articles || []
  for (const article of articlesArray) {
    if (processedArticles.has(article.id)) continue

    // Check if article matches existing cluster
    if (clusterFuse) {
      const matches = clusterFuse.search(article.title)
      if (matches.length > 0 && matches[0].score && matches[0].score < 0.4) {
        const cluster = matches[0].item as Database['public']['Tables']['clusters']['Row']
        
        // Add to existing cluster
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('articles')
          .update({ cluster_id: cluster.id })
          .eq('id', article.id)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('clusters')
          .update({
            article_count: (cluster.article_count || 0) + 1,
            window_end: new Date().toISOString(),
          })
          .eq('id', cluster.id)

        processedArticles.add(article.id)
        result.updated++
        continue
      }
    }

    // Find similar articles to create new cluster
    // Use a more lenient threshold and allow clusters with fewer articles
    const articleFuse = new Fuse(
      articlesArray.filter((a: Article) => !processedArticles.has(a.id) && a.id !== article.id),
      {
        keys: article.snippet ? ['title', 'snippet'] : ['title'],
        threshold: 0.6, // More lenient threshold
        includeScore: true,
        minMatchCharLength: 10, // Minimum character length for matching
      }
    )

    const similarArticles = articleFuse
      .search(article.title)
      .filter((m) => m.score && m.score < 0.6)
      .map((m) => m.item)

    // Allow clusters with just 1 similar article (2 total) or more
    if (similarArticles.length >= 1) {
      // Create cluster key from normalized title
      const clusterKey = article.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .slice(0, 5)
        .join('-')

      const clusterArticles = [article, ...similarArticles]
      
      if (!newClusters.has(clusterKey)) {
        newClusters.set(clusterKey, clusterArticles)
      }

      clusterArticles.forEach((a) => processedArticles.add(a.id))
    }
  }

  // Create new clusters
  for (const [, clusterArticles] of Array.from(newClusters.entries())) {
    try {
      const dates = clusterArticles
        .map((a: Article) => a.published_at ? new Date(a.published_at).getTime() : Date.now())
        .filter((d): d is number => Boolean(d))

      if (dates.length === 0) {
        console.warn('Cluster articles have no valid dates, skipping')
        continue
      }

      const windowStart = new Date(Math.min(...dates)).toISOString()
      const windowEnd = new Date(Math.max(...dates)).toISOString()

      // Aggregate countries and topics
      const countries = Array.from(new Set(clusterArticles.flatMap((a: Article) => (a.countries || []) as string[])))
      const topics = Array.from(new Set(clusterArticles.flatMap((a: Article) => (a.topics || []) as string[])))

      // Calculate severity based on source count and spread
      const uniqueSources = new Set(clusterArticles.map((a: Article) => a.source_id))
      const sourceDiversity = Math.min(uniqueSources.size * 15, 60)
      const recency = Math.max(0, 40 - Math.floor((Date.now() - new Date(windowEnd).getTime()) / (1000 * 60 * 60 * 24)) * 10)
      const severity = Math.min(100, sourceDiversity + recency)

      // Calculate confidence
      const confidence = Math.min(100, 30 + clusterArticles.length * 10 + uniqueSources.size * 5)

      // Create cluster
      const { data: cluster, error: clusterError } = await supabase
        .from('clusters')
        .insert({
          canonical_title: clusterArticles[0].title,
          window_start: windowStart,
          window_end: windowEnd,
          countries,
          topics,
          severity,
          confidence,
          article_count: clusterArticles.length,
          source_count: uniqueSources.size,
        } as any)
        .select()
        .single()

      if (clusterError) {
        console.error('Error creating cluster:', clusterError)
        continue
      }

      if (cluster) {
        // Update articles with cluster_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('articles')
          .update({ cluster_id: (cluster as any).id })
          .in(
            'id',
            clusterArticles.map((a: Article) => a.id)
          )

        if (updateError) {
          console.error('Error updating articles with cluster_id:', updateError)
          continue
        }

        result.created++
      }
    } catch (error) {
      console.error('Error processing cluster:', error)
      continue
    }
  }

  console.log(`Clustering complete: ${result.created} clusters created, ${result.updated} clusters updated`)
  console.log(`Processed ${processedArticles.size} articles out of ${articles.length} total`)

  return result
}

