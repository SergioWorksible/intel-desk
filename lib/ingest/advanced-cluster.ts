import { SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type { Database } from '@/types/database'

type Article = Database['public']['Tables']['articles']['Row']

interface ClusterResult {
  created: number
  updated: number
}

interface GeopoliticalAnalysis {
  canonical_title: string
  summary: string
  countries: string[]
  topics: string[]
  entities: {
    people: string[]
    organizations: string[]
    locations: string[]
    events: string[]
  }
  relationships: {
    actor: string
    action: string
    target: string
    type: 'cooperation' | 'conflict' | 'trade' | 'diplomacy' | 'military' | 'economic' | 'other'
  }[]
  severity: number
  confidence: number
  geopolitical_implications: string[]
  key_signals: string[]
  timeline: {
    event: string
    date?: string
    significance: 'high' | 'medium' | 'low'
  }[]
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const GEOPOLITICAL_ANALYSIS_PROMPT = `Eres un analista de inteligencia geopolítica experto para Intel Desk. 
Analiza grupos de artículos de noticias y proporciona un análisis geopolítico profundo.

Debes responder SOLO en formato JSON con esta estructura exacta:
{
  "canonical_title": "Título canónico que resume el evento principal",
  "summary": "Resumen ejecutivo de 2-3 párrafos del evento geopolítico",
  "countries": ["País1", "País2"],
  "topics": ["tema1", "tema2"],
  "entities": {
    "people": ["Persona 1", "Persona 2"],
    "organizations": ["Org 1", "Org 2"],
    "locations": ["Ubicación 1"],
    "events": ["Evento clave"]
  },
  "relationships": [
    {
      "actor": "Actor principal",
      "action": "Acción realizada",
      "target": "Objetivo/afectado",
      "type": "cooperation|conflict|trade|diplomacy|military|economic|other"
    }
  ],
  "severity": 75,
  "confidence": 85,
  "geopolitical_implications": [
    "Implicación 1: explicación detallada",
    "Implicación 2: explicación detallada"
  ],
  "key_signals": [
    "Señal observable específica a monitorear",
    "Otra señal importante"
  ],
  "timeline": [
    {
      "event": "Descripción del evento",
      "date": "2024-01-05",
      "significance": "high|medium|low"
    }
  ]
}

REGLAS CRÍTICAS:
1. Severity (0-100): Basado en impacto geopolítico real, no solo volumen de noticias
   - 80-100: Eventos que pueden cambiar el equilibrio de poder, conflictos mayores, cambios de régimen
   - 60-79: Eventos significativos con impacto regional o global
   - 40-59: Eventos importantes pero limitados en alcance
   - 0-39: Eventos menores o rutinarios

2. Confidence (0-100): Basado en calidad y consistencia de fuentes
   - 80-100: Múltiples fuentes confiables confirman, información consistente
   - 60-79: Información consistente pero fuentes limitadas
   - 40-59: Información parcial o contradictoria
   - 0-39: Información muy limitada o no verificable

3. Extrae TODAS las entidades relevantes: líderes, organizaciones, ubicaciones específicas

4. Identifica relaciones geopolíticas: quién hace qué a quién y por qué importa

5. Las implicaciones deben ser específicas y accionables, no genéricas

6. Las señales deben ser observables y medibles

7. El timeline debe ordenar eventos cronológicamente cuando sea posible`

/**
 * Analyze articles using AI to extract geopolitical insights
 */
export async function analyzeGeopolitical(
  articles: Article[]
): Promise<GeopoliticalAnalysis | null> {
  try {
    // Prepare article context
    const articleTexts = articles
      .map((a, i) => {
        const source = a.domain || 'Unknown'
        const date = a.published_at ? new Date(a.published_at).toISOString().split('T')[0] : 'Unknown date'
        return `[Artículo ${i + 1}]
Fuente: ${source}
Fecha: ${date}
Título: ${a.title}
Contenido: ${a.full_content || a.snippet || 'Sin contenido'}
Países mencionados: ${a.countries.join(', ') || 'Ninguno'}
Temas: ${a.topics.join(', ') || 'Ninguno'}
---`
      })
      .join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: GEOPOLITICAL_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: `Analiza estos ${articles.length} artículos relacionados y proporciona un análisis geopolítico completo:

${articleTexts}

Proporciona un análisis que:
1. Identifique el evento geopolítico central
2. Extraiga todas las entidades relevantes (personas, organizaciones, ubicaciones)
3. Identifique relaciones y dinámicas geopolíticas
4. Evalúe severidad basada en impacto real, no solo volumen
5. Identifique implicaciones geopolíticas específicas
6. Liste señales clave a monitorear
7. Construya un timeline de eventos cuando sea posible

Responde SOLO en formato JSON válido.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error('Empty response from AI')
      return null
    }

    const analysis = JSON.parse(content) as GeopoliticalAnalysis

    // Validate required fields
    if (!analysis.canonical_title || !analysis.summary) {
      console.error('Invalid analysis structure')
      return null
    }

    return analysis
  } catch (error) {
    console.error('Error in geopolitical analysis:', error)
    return null
  }
}

/**
 * Group articles by semantic similarity using embeddings
 */
async function groupArticlesBySemanticSimilarity(
  articles: Article[]
): Promise<Article[][]> {
  // For now, use a simpler grouping based on:
  // 1. Country overlap
  // 2. Topic overlap
  // 3. Title similarity (using simple text matching)
  // In production, use embeddings/vector similarity

  const groups: Article[][] = []
  const processed = new Set<string>()

  for (const article of articles) {
    if (processed.has(article.id)) continue

    const group: Article[] = [article]
    processed.add(article.id)

    // Find similar articles
    for (const other of articles) {
      if (processed.has(other.id)) continue
      if (article.id === other.id) continue

      // Calculate similarity score
      let similarity = 0

      // Country overlap (40% weight)
      const articleCountries = new Set(article.countries || [])
      const otherCountries = new Set(other.countries || [])
      const countryIntersection = Array.from(articleCountries).filter((c) => otherCountries.has(c)).length
      const countryUnion = new Set([...Array.from(articleCountries), ...Array.from(otherCountries)]).size
      if (countryUnion > 0) {
        similarity += (countryIntersection / countryUnion) * 0.4
      }

      // Topic overlap (30% weight)
      const articleTopics = new Set(article.topics || [])
      const otherTopics = new Set(other.topics || [])
      const topicIntersection = Array.from(articleTopics).filter((t) => otherTopics.has(t)).length
      const topicUnion = new Set([...Array.from(articleTopics), ...Array.from(otherTopics)]).size
      if (topicUnion > 0) {
        similarity += (topicIntersection / topicUnion) * 0.3
      }

      // Title and content similarity (30% weight) - simple word overlap
      const articleText = `${article.title} ${article.snippet || ''} ${article.full_content || ''}`
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
      
      const otherText = `${other.title} ${other.snippet || ''} ${other.full_content || ''}`
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
      
      const articleWords = new Set(articleText)
      const otherWords = new Set(otherText)
      const wordIntersection = Array.from(articleWords).filter((w) => otherWords.has(w)).length
      const wordUnion = new Set([...Array.from(articleWords), ...Array.from(otherWords)]).size
      if (wordUnion > 0) {
        similarity += (wordIntersection / wordUnion) * 0.3
      }

      // Time proximity bonus (articles published close together are more likely related)
      if (article.published_at && other.published_at) {
        const timeDiff = Math.abs(
          new Date(article.published_at).getTime() - new Date(other.published_at).getTime()
        )
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
        if (daysDiff <= 1) {
          similarity += 0.1 // Bonus for same-day articles
        } else if (daysDiff <= 3) {
          similarity += 0.05 // Small bonus for articles within 3 days
        }
      }

      // If similarity is high enough, add to group
      // Lower threshold to create more clusters
      if (similarity >= 0.15) {
        group.push(other)
        processed.add(other.id)
      }
    }

    // Only create clusters with at least 2 articles
    if (group.length >= 2) {
      groups.push(group)
    }
  }

  return groups
}

/**
 * Advanced clustering with AI-powered geopolitical analysis
 */
export async function advancedClusterArticles(
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
    .limit(100) // Process smaller batches to avoid blocking

  if (error) {
    console.error('Error fetching articles for clustering:', error)
    return result
  }

  if (!articles || articles.length === 0) {
    console.log('No unclustered articles found in the last 7 days')
    return result
  }

  console.log(`Processing ${articles.length} articles with advanced clustering`)

  // Group articles by semantic similarity
  const articleGroups = await groupArticlesBySemanticSimilarity(articles)

  console.log(`Found ${articleGroups.length} potential clusters`)

  // Process groups in batches to avoid blocking and reduce API calls
  const BATCH_SIZE = 5 // Process 5 groups at a time
  const batches: Article[][][] = []
  
  for (let i = 0; i < articleGroups.length; i += BATCH_SIZE) {
    batches.push(articleGroups.slice(i, i + BATCH_SIZE))
  }

  console.log(`Processing ${articleGroups.length} groups in ${batches.length} batches`)

  // Process batches sequentially to avoid rate limits
  for (const batch of batches) {
    // Process batch in parallel
    const analyses = await Promise.allSettled(
      batch.map(group => analyzeGeopolitical(group))
    )

    // Process results
    for (let i = 0; i < batch.length; i++) {
      const group = batch[i]
      const analysisResult = analyses[i]

      if (analysisResult.status === 'rejected' || !analysisResult.value) {
        console.warn(`Failed to analyze group ${i + 1}, skipping`)
        continue
      }

      const analysis = analysisResult.value

      try {
        // Calculate dates
      const dates = group
        .map((a) => (a.published_at ? new Date(a.published_at).getTime() : Date.now()))
        .filter(Boolean)

      if (dates.length === 0) {
        console.warn('Group has no valid dates, skipping')
        continue
      }

      const windowStart = new Date(Math.min(...dates)).toISOString()
      const windowEnd = new Date(Math.max(...dates)).toISOString()

      // Get unique sources
      const uniqueSources = new Set(group.map((a) => a.source_id))

      // Create cluster with AI analysis
      const { data: cluster, error: clusterError } = await supabase
        .from('clusters')
        .insert({
          canonical_title: analysis.canonical_title,
          summary: analysis.summary,
          window_start: windowStart,
          window_end: windowEnd,
          countries: analysis.countries,
          topics: analysis.topics,
          entities: {
            // Store full geopolitical analysis
            people: analysis.entities.people,
            organizations: analysis.entities.organizations,
            locations: analysis.entities.locations,
            events: analysis.entities.events,
            relationships: analysis.relationships,
            implications: analysis.geopolitical_implications,
            key_signals: analysis.key_signals,
            timeline: analysis.timeline,
          },
          severity: analysis.severity,
          confidence: analysis.confidence,
          article_count: group.length,
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
            group.map((a: any) => a.id)
          )

        if (updateError) {
          console.error('Error updating articles with cluster_id:', updateError)
          continue
        }

        // Store geopolitical analysis in a separate table or JSONB field
        // For now, we'll store key insights in the summary and entities fields
        // In the future, we could create a separate geopolitical_analysis table

        result.created++
        console.log(`Created cluster: ${analysis.canonical_title} (${group.length} articles)`)
      }
      } catch (error) {
        console.error('Error processing cluster group:', error)
        continue
      }
    }

    // Small delay between batches to avoid rate limits
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`Advanced clustering complete: ${result.created} clusters created`)

  return result
}

