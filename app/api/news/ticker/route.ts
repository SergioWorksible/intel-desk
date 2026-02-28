import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Palabras clave que indican contenido NO geopolítico
const NON_GEOPOLITICAL_KEYWORDS = [
  'birthday', 'birthday party', 'fun facts', 'celebrity', 'entertainment',
  'music', 'movie', 'film', 'tv show', 'television', 'sports', 'sport',
  'recipe', 'cooking', 'food', 'restaurant', 'recipe', 'fashion', 'style',
  'beauty', 'makeup', 'gossip', 'rumor', 'dating', 'relationship',
  'horoscope', 'astrology', 'weather forecast', 'local news',
  'obituary', 'death notice', 'wedding', 'engagement', 'divorce',
  'pet', 'dog', 'cat', 'animal', 'wildlife', 'nature photography',
  'travel guide', 'vacation', 'tourism', 'hotel review',
  'product review', 'tech review', 'gadget', 'app review',
  'health tips', 'fitness', 'workout', 'diet', 'nutrition',
  'lifestyle', 'home decor', 'interior design', 'gardening',
]

// Palabras clave que indican contenido geopolítico
const GEOPOLITICAL_KEYWORDS = [
  'government', 'president', 'prime minister', 'minister', 'diplomat',
  'embassy', 'consulate', 'summit', 'treaty', 'agreement', 'sanctions',
  'trade war', 'tariff', 'export', 'import', 'economy', 'economic',
  'military', 'defense', 'armed forces', 'navy', 'army', 'air force',
  'conflict', 'war', 'peace', 'ceasefire', 'truce', 'negotiation',
  'election', 'vote', 'ballot', 'referendum', 'campaign',
  'protest', 'demonstration', 'riot', 'unrest', 'crisis',
  'refugee', 'migration', 'immigration', 'border', 'asylum',
  'terrorism', 'terrorist', 'attack', 'bombing', 'security',
  'nuclear', 'weapon', 'missile', 'sanctions', 'embargo',
  'alliance', 'partnership', 'cooperation', 'tension', 'dispute',
  'international', 'global', 'world', 'foreign policy', 'diplomacy',
]

/**
 * Check if article title/content is geopolitically relevant
 */
function isGeopoliticalRelevant(title: string, countries: string[], topics: string[]): boolean {
  const titleLower = title.toLowerCase()
  
  // Si tiene países mencionados, es relevante
  if (countries && countries.length > 0) {
    return true
  }
  
  // Si tiene temas geopolíticos, es relevante
  if (topics && topics.length > 0) {
    const geopoliticalTopics = ['politics', 'diplomacy', 'military', 'conflict', 'trade', 
      'economy', 'sanctions', 'election', 'government', 'international', 'foreign policy']
    if (topics.some(topic => geopoliticalTopics.some(gt => topic.toLowerCase().includes(gt)))) {
      return true
    }
  }
  
  // Si contiene palabras clave NO geopolíticas, excluir
  if (NON_GEOPOLITICAL_KEYWORDS.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
    return false
  }
  
  // Si contiene palabras clave geopolíticas, incluir
  if (GEOPOLITICAL_KEYWORDS.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
    return true
  }
  
  // Si está en un cluster, es relevante (ya fue analizado como geopolítico)
  // Esto se maneja en la query
  
  // Por defecto, si no hay indicadores claros, excluir para evitar ruido
  return false
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Fetch recent articles from last 24 hours, ordered by recency and severity
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Get articles with their cluster info for severity
    // Priorizar artículos que están en clusters (ya analizados como geopolíticos)
    // O que tienen países mencionados
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        url,
        domain,
        published_at,
        countries,
        topics,
        cluster_id,
        clusters(severity)
      `)
      .gte('published_at', twentyFourHoursAgo)
      .order('published_at', { ascending: false })
      .limit(100) // Obtener más para filtrar después

    if (error) {
      console.error('Error fetching articles for ticker:', error)
      throw error
    }

    // Filtrar y priorizar artículos geopolíticos
    const filteredArticles = (articles || [])
      .filter((article: any) => {
        // Prioridad 1: Artículos en clusters (ya analizados como geopolíticos)
        if (article.cluster_id) {
          return true
        }
        
        // Prioridad 2: Artículos con países mencionados
        if (article.countries && article.countries.length > 0) {
          return true
        }
        
        // Prioridad 3: Verificar relevancia geopolítica por título/temas
        return isGeopoliticalRelevant(
          article.title || '',
          article.countries || [],
          article.topics || []
        )
      })
      .sort((a: any, b: any) => {
        // Ordenar por: 1) En cluster, 2) Severidad, 3) Fecha
        if (a.cluster_id && !b.cluster_id) return -1
        if (!a.cluster_id && b.cluster_id) return 1
        
        const severityA = a.clusters?.severity || 0
        const severityB = b.clusters?.severity || 0
        if (severityA !== severityB) {
          return severityB - severityA
        }
        
        const dateA = new Date(a.published_at || 0).getTime()
        const dateB = new Date(b.published_at || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 50) // Limitar a 50 después del filtrado

    // Transform data to include severity from cluster
    const items = filteredArticles.map((article: any) => ({
      id: article.id,
      title: article.title,
      url: article.url,
      domain: article.domain,
      published_at: article.published_at,
      countries: article.countries || [],
      severity: article.clusters?.severity || null,
      cluster_id: article.cluster_id,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error in ticker API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news ticker', items: [] },
      { status: 500 }
    )
  }
}
