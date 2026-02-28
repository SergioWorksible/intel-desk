import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export interface AtlasContext {
  recentArticles: Array<{
    title: string
    snippet: string
    url: string
    published_at: string
    countries: string[]
    topics: string[]
  }>
  recentClusters: Array<{
    title: string
    summary: string
    countries: string[]
    topics: string[]
    severity: number
  }>
  recentBriefing: {
    date: string
    items: Array<{
      title: string
      fact: string
      countries: string[]
      topics: string[]
    }>
  } | null
  watchlistCountries: Array<{
    code: string
    name: string
    overview: string
  }>
}

/**
 * Obtiene contexto relevante de Intel Desk para el chatbot Atlas
 */
export async function getAtlasContext(
  supabase: SupabaseClient<Database>,
  query?: string
): Promise<AtlasContext> {
  // Obtener artículos recientes (últimas 24 horas)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  let articlesQuery = supabase
    .from('articles')
    .select('title, snippet, url, published_at, countries, topics')
    .gte('published_at', yesterday.toISOString())
    .order('published_at', { ascending: false })
    .limit(20)

  // Si hay una query, buscar artículos relevantes
  if (query) {
    const rpcCall = (supabase.rpc as any)('search_articles', {
      query_text: query,
      limit_count: 15,
    }) as Promise<{ data: Array<{ id: string }> | null }>
    const { data: searchResults } = await rpcCall
    
    if (searchResults && searchResults.length > 0) {
      articlesQuery = supabase
        .from('articles')
        .select('title, snippet, url, published_at, countries, topics')
        .in('id', searchResults.map((r) => r.id))
        .order('published_at', { ascending: false })
        .limit(15)
    }
  }

  const { data: articles } = await articlesQuery as { data: Array<{
    title: string
    snippet: string | null
    url: string
    published_at: string | null
    countries: string[]
    topics: string[]
  }> | null }

  // Obtener clusters recientes
  const { data: clusters } = await supabase
    .from('clusters')
    .select('canonical_title, summary, countries, topics, severity')
    .order('updated_at', { ascending: false })
    .limit(10) as { data: Array<{
      canonical_title: string
      summary: string | null
      countries: string[]
      topics: string[]
      severity: number
    }> | null }

  // Obtener briefing más reciente
  const { data: briefings } = await supabase
    .from('briefings')
    .select('date, items')
    .order('date', { ascending: false })
    .limit(1) as { data: Array<{
      date: string
      items: Json
    }> | null }

  // Obtener países en watchlist
  const { data: countries } = await supabase
    .from('countries')
    .select('code, name, overview')
    .eq('watchlist', true)
    .limit(10) as { data: Array<{
      code: string
      name: string
      overview: string | null
    }> | null }

  return {
    recentArticles: (articles || []).map((a) => ({
      title: a.title,
      snippet: a.snippet || '',
      url: a.url,
      published_at: a.published_at || '',
      countries: a.countries || [],
      topics: a.topics || [],
    })),
    recentClusters: (clusters || []).map((c) => ({
      title: c.canonical_title,
      summary: c.summary || '',
      countries: c.countries || [],
      topics: c.topics || [],
      severity: c.severity,
    })),
    recentBriefing: briefings && briefings.length > 0
      ? {
          date: briefings[0].date,
          items: (briefings[0].items as any[] || []).slice(0, 5).map((item: any) => ({
            title: item.title || '',
            fact: item.fact || '',
            countries: item.countries || [],
            topics: item.topics || [],
          })),
        }
      : null,
    watchlistCountries: (countries || []).map((c) => ({
      code: c.code,
      name: c.name,
      overview: c.overview || '',
    })),
  }
}

/**
 * Formatea el contexto de Intel Desk para incluir en el prompt
 */
export function formatAtlasContext(context: AtlasContext): string {
  let formatted = '=== CONTEXTO DE INTEL DESK ===\n\n'

  // Briefing reciente
  if (context.recentBriefing) {
    formatted += `BRIEFING DIARIO (${context.recentBriefing.date}):\n`
    context.recentBriefing.items.forEach((item, i) => {
      formatted += `${i + 1}. ${item.title}\n`
      formatted += `   Hecho: ${item.fact}\n`
      if (item.countries.length > 0) {
        formatted += `   Países: ${item.countries.join(', ')}\n`
      }
      if (item.topics.length > 0) {
        formatted += `   Temas: ${item.topics.join(', ')}\n`
      }
      formatted += '\n'
    })
    formatted += '\n'
  }

  // Clusters recientes
  if (context.recentClusters.length > 0) {
    formatted += 'EVENTOS CLAVE RECIENTES:\n'
    context.recentClusters.slice(0, 5).forEach((cluster, i) => {
      formatted += `${i + 1}. ${cluster.title} (Severidad: ${cluster.severity}/100)\n`
      if (cluster.summary) {
        formatted += `   ${cluster.summary}\n`
      }
      if (cluster.countries.length > 0) {
        formatted += `   Países: ${cluster.countries.join(', ')}\n`
      }
      if (cluster.topics.length > 0) {
        formatted += `   Temas: ${cluster.topics.join(', ')}\n`
      }
      formatted += '\n'
    })
    formatted += '\n'
  }

  // Artículos recientes
  if (context.recentArticles.length > 0) {
    formatted += 'NOTICIAS RECIENTES:\n'
    context.recentArticles.slice(0, 10).forEach((article, i) => {
      formatted += `${i + 1}. ${article.title}\n`
      if (article.snippet) {
        formatted += `   ${article.snippet.substring(0, 150)}...\n`
      }
      if (article.countries.length > 0) {
        formatted += `   Países: ${article.countries.join(', ')}\n`
      }
      if (article.topics.length > 0) {
        formatted += `   Temas: ${article.topics.join(', ')}\n`
      }
      formatted += '\n'
    })
    formatted += '\n'
  }

  // Países en watchlist
  if (context.watchlistCountries.length > 0) {
    formatted += 'PAÍSES EN MONITOREO:\n'
    context.watchlistCountries.forEach((country) => {
      formatted += `- ${country.name} (${country.code})`
      if (country.overview) {
        formatted += `: ${country.overview.substring(0, 100)}...`
      }
      formatted += '\n'
    })
    formatted += '\n'
  }

  formatted += '=== FIN DEL CONTEXTO ===\n'

  return formatted
}

