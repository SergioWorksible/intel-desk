import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { enrichClusterWithAI } from './enrich-cluster'

type Article = Database['public']['Tables']['articles']['Row']

interface ClusterResult {
  created: number
  updated: number
}

/**
 * Extract key words from text (remove common words, keep meaningful terms)
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here', 'where', 'when',
    'what', 'who', 'which', 'why', 'how', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'said', 'says', 'say', 'new', 'old', 'more', 'most', 'less', 'least',
    'very', 'much', 'many', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'other',
    'such', 'only', 'own', 'same', 'than', 'too', 'just', 'also', 'now', 'today', 'yesterday',
    'tomorrow', 'year', 'years', 'month', 'months', 'day', 'days', 'week', 'weeks', 'time',
    'times', 'first', 'last', 'next', 'previous', 'recent', 'recently'
  ])

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 15) // Keep top 15 keywords
  )
}

/**
 * Calculate similarity between two articles (0-1)
 */
function calculateSimilarity(article1: Article, article2: Article): number {
  let score = 0
  let weight = 0

  // 1. Title keyword overlap (40% weight)
  const title1Keywords = extractKeywords(article1.title)
  const title2Keywords = extractKeywords(article2.title)
  const titleIntersection = Array.from(title1Keywords).filter((k) => title2Keywords.has(k)).length
  const titleUnion = new Set([...Array.from(title1Keywords), ...Array.from(title2Keywords)]).size
  if (titleUnion > 0) {
    score += (titleIntersection / titleUnion) * 0.4
  }
  weight += 0.4

  // 2. Country overlap (30% weight)
  const countries1 = new Set(article1.countries || [])
  const countries2 = new Set(article2.countries || [])
  if (countries1.size > 0 || countries2.size > 0) {
    const countryIntersection = Array.from(countries1).filter((c) => countries2.has(c)).length
    const countryUnion = new Set([...Array.from(countries1), ...Array.from(countries2)]).size
    if (countryUnion > 0) {
      score += (countryIntersection / countryUnion) * 0.3
    }
    weight += 0.3
  }

  // 3. Topic overlap (20% weight)
  const topics1 = new Set(article1.topics || [])
  const topics2 = new Set(article2.topics || [])
  if (topics1.size > 0 || topics2.size > 0) {
    const topicIntersection = Array.from(topics1).filter((t) => topics2.has(t)).length
    const topicUnion = new Set([...Array.from(topics1), ...Array.from(topics2)]).size
    if (topicUnion > 0) {
      score += (topicIntersection / topicUnion) * 0.2
    }
    weight += 0.2
  }

  // 4. Domain match (10% weight) - same source often covers same story
  if (article1.domain === article2.domain) {
    score += 0.1
  }
  weight += 0.1

  // 5. Time proximity bonus (max 0.1 bonus)
  if (article1.published_at && article2.published_at) {
    const timeDiff = Math.abs(
      new Date(article1.published_at).getTime() - new Date(article2.published_at).getTime()
    )
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    if (hoursDiff <= 6) {
      score += 0.1 // Same day bonus
    } else if (hoursDiff <= 24) {
      score += 0.05 // Within 24h bonus
    }
  }

  // Normalize by weight
  return weight > 0 ? Math.min(1, score / weight) : 0
}

/**
 * Smart, fast clustering algorithm
 * Groups articles by similarity and creates clusters efficiently
 */
export async function smartClusterArticles(
  supabase: SupabaseClient<Database>
): Promise<ClusterResult> {
  const result: ClusterResult = {
    created: 0,
    updated: 0,
  }

  // Fetch unclustered articles from the last 3 days (shorter window for better performance)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .is('cluster_id', null)
    .gte('published_at', threeDaysAgo)
    .order('published_at', { ascending: false })
    .limit(200) as { data: Article[] | null; error: any }

  if (error) {
    console.error('Error fetching articles for clustering:', error)
    return result
  }

  if (!articles || articles.length === 0) {
    console.log('No unclustered articles found')
    return result
  }

  console.log(`Smart clustering: Processing ${articles.length} articles`)

  // Fetch recent clusters to check for matches
  const { data: existingClusters } = await supabase
    .from('clusters')
    .select('*')
    .gte('window_end', threeDaysAgo)
    .limit(100) as { data: Database['public']['Tables']['clusters']['Row'][] | null }

  const processed = new Set<string>()
  const newClusters: Article[][] = []
  const articlesArray = articles || []
  const clustersArray = existingClusters || []

  // First pass: Try to match articles to existing clusters
  if (clustersArray.length > 0) {
    for (const article of articlesArray) {
      if (processed.has(article.id)) continue

      // Find best matching cluster
      let bestMatch: { cluster: Database['public']['Tables']['clusters']['Row']; score: number } | null = null

      for (const cluster of clustersArray) {
        // Simple matching: check if article title keywords match cluster title
        const articleKeywords = extractKeywords(article.title)
        const clusterKeywords = extractKeywords(cluster.canonical_title || '')
        const intersection = Array.from(articleKeywords).filter((k) => clusterKeywords.has(k)).length
        const union = new Set([...Array.from(articleKeywords), ...Array.from(clusterKeywords)]).size
        const matchScore = union > 0 ? intersection / union : 0

        // Also check country overlap
        const articleCountries = new Set((article.countries || []) as string[])
        const clusterCountries = new Set((cluster.countries || []) as string[])
        const countryMatch = Array.from(articleCountries).filter((c) => clusterCountries.has(c)).length > 0

        const totalScore = matchScore * 0.7 + (countryMatch ? 0.3 : 0)

        if (totalScore > 0.3 && (!bestMatch || totalScore > bestMatch.score)) {
          bestMatch = { cluster, score: totalScore }
        }
      }

      if (bestMatch) {
        // Add to existing cluster
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: linkError } = await (supabase as any)
          .from('articles')
          .update({ cluster_id: bestMatch.cluster.id })
          .eq('id', article.id)

        if (linkError) {
          console.error('Smart clustering: failed to link article to existing cluster', {
            article_id: article.id,
            cluster_id: bestMatch.cluster.id,
            error: linkError,
          })
          continue
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: clusterUpdateError } = await (supabase as any)
          .from('clusters')
          .update({
            article_count: (bestMatch.cluster.article_count || 0) + 1,
            window_end: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', bestMatch.cluster.id)

        if (clusterUpdateError) {
          console.error('Smart clustering: failed to update existing cluster counts', {
            cluster_id: bestMatch.cluster.id,
            error: clusterUpdateError,
          })
        }

        processed.add(article.id)
        result.updated++
      }
    }
  }

  // Second pass: Create new clusters from remaining articles
  const unprocessedArticles = articlesArray.filter((a: Article) => !processed.has(a.id))

  for (const article of unprocessedArticles) {
    if (processed.has(article.id)) continue

    const cluster: Article[] = [article]
    processed.add(article.id)

    // Find similar articles
    for (const other of unprocessedArticles) {
      if (processed.has(other.id)) continue
      if (article.id === other.id) continue

      const similarity = calculateSimilarity(article, other)

      // Threshold: 0.25 means at least 25% similarity across all factors
      if (similarity >= 0.25) {
        cluster.push(other)
        processed.add(other.id)
      }
    }

    // Only create clusters with at least 2 articles
    if (cluster.length >= 2) {
      newClusters.push(cluster)
    }
  }

  // Create new clusters in database
  const createdClusters: Array<{ cluster: Database['public']['Tables']['clusters']['Row']; articles: Article[] }> = []
  
  for (const clusterArticles of newClusters) {
    try {
      const dates = clusterArticles
        .map((a: Article) => (a.published_at ? new Date(a.published_at).getTime() : Date.now()))
        .filter((d): d is number => Boolean(d))

      if (dates.length === 0) continue

      const windowStart = new Date(Math.min(...dates)).toISOString()
      const windowEnd = new Date(Math.max(...dates)).toISOString()

      // Aggregate metadata
      const countries = Array.from(
        new Set(clusterArticles.flatMap((a: Article) => (a.countries || []) as string[]))
      ).slice(0, 10) // Limit to 10 countries
      const topics = Array.from(
        new Set(clusterArticles.flatMap((a: Article) => (a.topics || []) as string[]))
      ).slice(0, 10) // Limit to 10 topics

      // Calculate severity and confidence
      const uniqueSources = new Set(clusterArticles.map((a: Article) => a.source_id))
      const sourceCount = uniqueSources.size
      const articleCount = clusterArticles.length

      // Severity: based on source diversity and article count
      const severity = Math.min(100, Math.floor(sourceCount * 12 + articleCount * 5))

      // Confidence: based on article count and source diversity
      const confidence = Math.min(100, Math.floor(30 + articleCount * 8 + sourceCount * 5))

      // Use most common title keywords as canonical title
      const titleKeywords = clusterArticles
        .flatMap((a) => Array.from(extractKeywords(a.title)))
        .reduce((acc, word) => {
          acc[word] = (acc[word] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const topKeywords = Object.entries(titleKeywords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word)
        .join(' ')

      const canonicalTitle = clusterArticles[0].title.length < 100
        ? clusterArticles[0].title
        : topKeywords || clusterArticles[0].title

      // Create cluster
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cluster, error: clusterError } = await (supabase as any)
        .from('clusters')
        .insert({
          canonical_title: canonicalTitle,
          summary: `Event covered by ${articleCount} articles from ${sourceCount} sources`,
          window_start: windowStart,
          window_end: windowEnd,
          countries,
          topics,
          severity,
          confidence,
          article_count: articleCount,
          source_count: sourceCount,
        })
        .select()
        .single()

      if (clusterError || !cluster) {
        console.error('Error creating cluster:', clusterError)
        continue
      }

      // Update articles with cluster_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: linkError } = await (supabase as any)
        .from('articles')
        .update({ cluster_id: cluster.id })
        .in(
          'id',
          clusterArticles.map((a) => a.id)
        )

      if (linkError) {
        console.error('Smart clustering: failed to link articles to new cluster', {
          cluster_id: cluster.id,
          article_ids: clusterArticles.map((a) => a.id),
          error: linkError,
        })
        continue
      }

      createdClusters.push({ cluster, articles: clusterArticles })
      result.created++
    } catch (error) {
      console.error('Error processing cluster:', error)
      continue
    }
  }

  console.log(
    `Smart clustering complete: ${result.created} clusters created, ${result.updated} clusters updated`
  )

  // Enrich clusters with AI analysis (completely async, non-blocking)
  // This runs in the background and doesn't block the response
  if (createdClusters.length > 0 && process.env.OPENAI_API_KEY) {
    // Start enrichment in background without awaiting
    enrichClustersInBackground(supabase, createdClusters).catch((error) => {
      console.error('Background enrichment error:', error)
    })
  }

  return result
}

/**
 * Enrich clusters in background (non-blocking)
 */
async function enrichClustersInBackground(
  supabase: SupabaseClient<Database>,
  createdClusters: Array<{ cluster: Database['public']['Tables']['clusters']['Row']; articles: Article[] }>
) {
  console.log(`Starting background enrichment for ${createdClusters.length} clusters...`)
  
  // Process in batches to avoid rate limits
  const ENRICHMENT_BATCH_SIZE = 3
  for (let i = 0; i < createdClusters.length; i += ENRICHMENT_BATCH_SIZE) {
    const batch = createdClusters.slice(i, i + ENRICHMENT_BATCH_SIZE)
    
    await Promise.allSettled(
      batch.map(async ({ cluster, articles }) => {
        try {
          const enrichment = await enrichClusterWithAI(cluster, articles)
          if (enrichment) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
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
              .eq('id', cluster.id)
            
            if (error) {
              console.error(`Error updating enriched cluster ${cluster.id}:`, error)
            } else {
              console.log(`✓ Enriched cluster: ${cluster.id}`)
            }
          }
        } catch (error) {
          console.error(`Error enriching cluster ${cluster.id}:`, error)
          // Don't fail the whole process if enrichment fails
        }
      })
    )
    
    // Small delay between batches to avoid rate limits
    if (i + ENRICHMENT_BATCH_SIZE < createdClusters.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
    }
  }
  
  console.log(`AI enrichment complete for ${createdClusters.length} clusters`)
}

