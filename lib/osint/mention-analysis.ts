import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import OpenAI from 'openai'

type Article = Database['public']['Tables']['articles']['Row']

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface MentionAnalysis {
  countries: string[]
  entities: {
    people: string[]
    organizations: string[]
    locations: string[]
    events: string[]
  }
  topics: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  key_mentions: Array<{
    entity: string
    type: 'country' | 'person' | 'organization' | 'location' | 'event'
    context: string
    frequency: number
  }>
}

const MENTION_EXTRACTION_PROMPT = `
Eres un analista de OSINT (Open Source Intelligence) especializado en análisis de menciones geopolíticas.
Analiza el contenido de artículos de noticias y extrae menciones relevantes de países, entidades, personas y eventos.

Debes responder SOLO en formato JSON con esta estructura exacta:
{
  "countries": ["US", "CN", "RU"],
  "entities": {
    "people": ["Nombre Persona 1", "Nombre Persona 2"],
    "organizations": ["Organización 1", "Organización 2"],
    "locations": ["Ciudad 1", "Región 1"],
    "events": ["Evento clave 1"]
  },
  "topics": ["tema1", "tema2", "tema3"],
  "sentiment": "positive|neutral|negative",
  "key_mentions": [
    {
      "entity": "Nombre de la entidad",
      "type": "country|person|organization|location|event",
      "context": "Contexto breve donde se menciona",
      "frequency": 3
    }
  ]
}

REGLAS:
1. Países: Usa códigos ISO de 2 letras (US, CN, RU, GB, etc.)
2. Personas: Solo líderes políticos, figuras públicas relevantes, oficiales de alto rango
3. Organizaciones: Gobiernos, instituciones internacionales, empresas relevantes geopolíticamente
4. Ubicaciones: Ciudades, regiones, zonas de conflicto específicas
5. Eventos: Eventos geopolíticos clave mencionados
6. Sentiment: Evalúa el tono general del artículo respecto a los temas geopolíticos
7. Key mentions: Lista las menciones más importantes con contexto y frecuencia

IMPORTANTE: Responde SOLO con el JSON válido, sin texto adicional.
`

/**
 * Analyze article content to extract mentions and entities
 */
export async function analyzeMentions(
  article: Article
): Promise<MentionAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, skipping mention analysis')
    return null
  }

  try {
    const content = article.full_content || article.snippet || article.title
    if (!content) {
      return null
    }

    const prompt = `${MENTION_EXTRACTION_PROMPT}

ARTÍCULO A ANALIZAR:
Título: ${article.title}
Contenido: ${content.substring(0, 3000)}
Países ya detectados: ${(article.countries || []).join(', ') || 'Ninguno'}
Temas ya detectados: ${(article.topics || []).join(', ') || 'Ninguno'}

Extrae todas las menciones relevantes del artículo.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un analista experto de OSINT. Responde siempre en formato JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    })

    const content_response = response.choices[0]?.message?.content
    if (!content_response) {
      return null
    }

    const analysis = JSON.parse(content_response) as MentionAnalysis

    // Validate and clean the analysis
    return {
      countries: Array.isArray(analysis.countries)
        ? analysis.countries.filter((c) => c && c.length === 2).slice(0, 10)
        : [],
      entities: {
        people: Array.isArray(analysis.entities?.people)
          ? analysis.entities.people.slice(0, 15)
          : [],
        organizations: Array.isArray(analysis.entities?.organizations)
          ? analysis.entities.organizations.slice(0, 15)
          : [],
        locations: Array.isArray(analysis.entities?.locations)
          ? analysis.entities.locations.slice(0, 15)
          : [],
        events: Array.isArray(analysis.entities?.events)
          ? analysis.entities.events.slice(0, 10)
          : [],
      },
      topics: Array.isArray(analysis.topics) ? analysis.topics.slice(0, 10) : [],
      sentiment: analysis.sentiment || 'neutral',
      key_mentions: Array.isArray(analysis.key_mentions)
        ? analysis.key_mentions.slice(0, 20)
        : [],
    }
  } catch (error) {
    console.error('Error analyzing mentions:', error)
    return null
  }
}

/**
 * Batch analyze mentions for multiple articles
 */
export async function batchAnalyzeMentions(
  articles: Article[]
): Promise<Map<string, MentionAnalysis>> {
  const results = new Map<string, MentionAnalysis>()

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 5
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (article) => {
      const analysis = await analyzeMentions(article)
      if (analysis) {
        results.set(article.id, analysis)
      }
    })

    await Promise.all(promises)

    // Small delay between batches
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Update article with mention analysis results
 */
export async function updateArticleWithMentions(
  supabase: SupabaseClient<Database>,
  articleId: string,
  analysis: MentionAnalysis
): Promise<void> {
  // Merge countries (avoid duplicates)
  const existingCountries = analysis.countries || []
  const uniqueCountries = Array.from(new Set(existingCountries))

  // Build entities object
  const entities = {
    people: analysis.entities.people || [],
    organizations: analysis.entities.organizations || [],
    locations: analysis.entities.locations || [],
    events: analysis.entities.events || [],
    key_mentions: analysis.key_mentions || [],
    sentiment: analysis.sentiment || 'neutral',
  }

  // Merge topics
  const topics = Array.isArray(analysis.topics) ? analysis.topics : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('articles')
    .update({
      countries: uniqueCountries,
      topics: topics,
      entities: entities,
    })
    .eq('id', articleId)

  if (error) {
    console.error('Error updating article with mentions:', error)
    throw error
  }
}

/**
 * Get mention statistics for a time period
 */
export async function getMentionStats(
  supabase: SupabaseClient<Database>,
  startDate: Date,
  endDate: Date
): Promise<{
  country_mentions: Array<{ country: string; count: number }>
  top_entities: Array<{ entity: string; type: string; count: number }>
  topic_trends: Array<{ topic: string; count: number }>
}> {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('countries, topics, entities')
    .gte('published_at', startDate.toISOString())
    .lte('published_at', endDate.toISOString())

  if (error) {
    throw error
  }

  // Count country mentions
  const countryCounts = new Map<string, number>()
  const entityCounts = new Map<string, { type: string; count: number }>()
  const topicCounts = new Map<string, number>()

  articles?.forEach((article: any) => {
    // Count countries
    if (Array.isArray(article.countries)) {
      article.countries.forEach((country: string) => {
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
      })
    }

    // Count entities
    if (article.entities && typeof article.entities === 'object') {
      const entities = article.entities as any
      if (entities.people) {
        entities.people.forEach((person: string) => {
          const key = `person:${person}`
          entityCounts.set(key, {
            type: 'person',
            count: (entityCounts.get(key)?.count || 0) + 1,
          })
        })
      }
      if (entities.organizations) {
        entities.organizations.forEach((org: string) => {
          const key = `org:${org}`
          entityCounts.set(key, {
            type: 'organization',
            count: (entityCounts.get(key)?.count || 0) + 1,
          })
        })
      }
    }

    // Count topics
    if (Array.isArray(article.topics)) {
      article.topics.forEach((topic: string) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      })
    }
  })

  return {
    country_mentions: Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    top_entities: Array.from(entityCounts.entries())
      .map(([key, data]) => ({
        entity: key.split(':')[1],
        type: data.type,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    topic_trends: Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  }
}
