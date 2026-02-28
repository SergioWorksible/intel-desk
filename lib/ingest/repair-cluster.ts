import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { enrichClusterWithAI } from '@/lib/ingest/enrich-cluster'

type Cluster = Database['public']['Tables']['clusters']['Row']
type Article = Database['public']['Tables']['articles']['Row']

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'will',
    'would',
    'could',
    'should',
    'this',
    'that',
    'these',
    'those',
  ])

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 20)
  )
}

function keywordOverlapScore(a: string, b: string): number {
  const aK = extractKeywords(a)
  const bK = extractKeywords(b)
  const intersection = Array.from(aK).filter((k) => bK.has(k)).length
  const union = new Set([...Array.from(aK), ...Array.from(bK)]).size
  return union > 0 ? intersection / union : 0
}

export async function repairAndEnrichCluster(
  supabase: SupabaseClient<Database>,
  clusterId: string
): Promise<{ relinked: number }> {
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('*')
    .eq('id', clusterId)
    .single()

  if (clusterError || !cluster) {
    throw new Error(clusterError?.message || 'Cluster not found')
  }

  // Fetch already-linked articles
  const { data: linkedArticles, error: linkedError } = await supabase
    .from('articles')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('published_at', { ascending: false })
    .limit(500)

  if (linkedError) {
    throw new Error(linkedError.message)
  }

  // Fetch candidate articles in a wider time window around the cluster window
  const windowStart = (cluster as any).window_start
  const windowEnd = (cluster as any).window_end
  const start = new Date(new Date(windowStart).getTime() - 24 * 60 * 60 * 1000).toISOString()
  const end = new Date(new Date(windowEnd).getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error: candidatesError } = await supabase
    .from('articles')
    .select('*')
    .is('cluster_id', null)
    .gte('published_at', start)
    .lte('published_at', end)
    .order('published_at', { ascending: false })
    .limit(500)

  if (candidatesError) {
    throw new Error(candidatesError.message)
  }

  const scored = (candidates || [])
    .map((a: any) => ({
      article: a,
      score: keywordOverlapScore(a.title, (cluster as any).canonical_title),
    }))
    .filter((x) => x.score >= 0.22)
    .sort((a, b) => b.score - a.score)
    .slice(0, 75)

  const toLinkIds = scored.map((x) => (x.article as any).id)
  let relinked = 0

  if (toLinkIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: linkError } = await (supabase as any)
      .from('articles')
      .update({ cluster_id: clusterId })
      .in('id', toLinkIds)

    if (linkError) {
      throw new Error(linkError.message)
    }

    relinked = toLinkIds.length
  }

  // Re-fetch articles now linked to cluster
  const { data: allArticles, error: allArticlesError } = await supabase
    .from('articles')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('published_at', { ascending: false })
    .limit(500)

  if (allArticlesError) {
    throw new Error(allArticlesError.message)
  }

  const articles = allArticles || linkedArticles || []
  const uniqueSources = new Set(articles.map((a: any) => a.source_id))

  // Update counts even if enrichment is unavailable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('clusters')
    .update({
      article_count: articles.length,
      source_count: uniqueSources.size,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clusterId)

  // Enrich with AI (fills countries/topics/entities/map/markets)
  if (process.env.OPENAI_API_KEY && articles.length > 0) {
    const enrichment = await enrichClusterWithAI(cluster as Cluster, articles as Article[])
    if (enrichment) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('clusters')
        .update({
          canonical_title: enrichment.canonical_title,
          summary: enrichment.summary,
          countries: enrichment.countries,
          topics: enrichment.topics,
          entities: {
            people: enrichment.entities.people,
            organizations: enrichment.entities.organizations,
            locations: enrichment.entities.locations,
            events: enrichment.entities.events,
            relationships: [],
            implications: enrichment.geopolitical_implications,
            key_signals: enrichment.key_signals,
            timeline: [],
            market_impact: enrichment.market_impact,
            map_data: enrichment.map_data,
          },
          severity: enrichment.severity,
          confidence: enrichment.confidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clusterId)
    }
  }

  return { relinked }
}


