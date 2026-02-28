import OpenAI from 'openai'
import type { Database } from '@/types/database'

type Cluster = Database['public']['Tables']['clusters']['Row']
type Article = Database['public']['Tables']['articles']['Row']

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ClusterEnrichment {
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
  severity: number
  confidence: number
  geopolitical_implications: string[]
  key_signals: string[]
  market_impact?: {
    affected_sectors: string[]
    affected_regions: string[]
    potential_symbols: string[]
    risk_level: 'low' | 'medium' | 'high'
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
  }
  map_data?: {
    primary_locations: Array<{
      name: string
      coordinates?: { lat: number; lng: number }
      significance: 'primary' | 'secondary' | 'tertiary'
    }>
    affected_regions: string[]
    conflict_zones?: string[]
  }
}

const CLUSTER_ENRICHMENT_PROMPT = `Eres un analista de inteligencia geopolítica y mercados para Intel Desk.
Analiza este grupo de artículos de noticias y proporciona un análisis completo y estructurado.

Debes responder SOLO en formato JSON con esta estructura exacta:
{
  "canonical_title": "Título canónico preciso que resume el evento principal",
  "summary": "Resumen ejecutivo de 2-3 párrafos del evento geopolítico, incluyendo contexto y consecuencias",
  "countries": ["País1", "País2"],
  "topics": ["tema1", "tema2", "tema3"],
  "entities": {
    "people": ["Persona 1", "Persona 2"],
    "organizations": ["Org 1", "Org 2", "Org 3"],
    "locations": ["Ciudad 1", "Región 1"],
    "events": ["Evento clave 1", "Evento clave 2"]
  },
  "severity": 75,
  "confidence": 85,
  "geopolitical_implications": [
    "Implicación específica y accionable 1",
    "Implicación específica y accionable 2"
  ],
  "key_signals": [
    "Señal observable específica a monitorear",
    "Otra señal importante"
  ],
  "market_impact": {
    "affected_sectors": ["Energía", "Defensa", "Tecnología"],
    "affected_regions": ["Europa", "Asia-Pacífico"],
    "potential_symbols": ["OIL", "XLE", "ITA"],
    "risk_level": "high|medium|low",
    "timeframe": "immediate|short_term|medium_term|long_term"
  },
  "map_data": {
    "primary_locations": [
      {
        "name": "Kiev",
        "coordinates": {"lat": 50.4501, "lng": 30.5234},
        "significance": "primary|secondary|tertiary"
      }
    ],
    "affected_regions": ["Europa del Este", "Mar Negro"],
    "conflict_zones": ["Donbas"]
  }
}

REGLAS CRÍTICAS:

1. Severity (0-100): Basado en impacto geopolítico REAL
   - 80-100: Cambios de régimen, conflictos mayores, cambios en equilibrio de poder
   - 60-79: Eventos significativos con impacto regional/global
   - 40-59: Eventos importantes pero limitados
   - 0-39: Eventos menores o rutinarios

2. Confidence (0-100): Basado en calidad y consistencia de fuentes
   - 80-100: Múltiples fuentes confiables confirman
   - 60-79: Información consistente pero fuentes limitadas
   - 40-59: Información parcial o contradictoria
   - 0-39: Información muy limitada

3. Market Impact:
   - affected_sectors: Sectores económicos directamente afectados (Energía, Defensa, Tecnología, Finanzas, etc.)
   - affected_regions: Regiones geográficas económicas afectadas
   - potential_symbols: Símbolos de mercado relevantes (tickers, ETFs, índices) si aplica
   - risk_level: Nivel de riesgo para inversores
   - timeframe: Cuándo se espera el impacto

4. Map Data:
   - primary_locations: Ubicaciones específicas mencionadas con coordenadas si conoces
   - affected_regions: Regiones geográficas amplias afectadas
   - conflict_zones: Zonas de conflicto específicas si aplica

5. Extrae TODAS las entidades relevantes: líderes, organizaciones, ubicaciones específicas

6. Las implicaciones deben ser específicas y accionables, no genéricas

7. Las señales deben ser observables y medibles

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`

/**
 * Enrich a cluster with AI-powered analysis
 */
export async function enrichClusterWithAI(
  cluster: Cluster,
  articles: Article[]
): Promise<ClusterEnrichment | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not found, skipping enrichment')
    return null
  }

  try {
    // Prepare articles context
    const articlesContext = articles
      .slice(0, 10) // Limit to 10 most recent articles
      .map((article, index) => {
        return `Artículo ${index + 1}:
Título: ${article.title}
Fuente: ${article.domain}
Fecha: ${article.published_at || 'N/A'}
Países: ${(article.countries || []).join(', ') || 'N/A'}
Temas: ${(article.topics || []).join(', ') || 'N/A'}
Snippet: ${article.snippet?.substring(0, 300) || 'N/A'}`
      })
      .join('\n\n')

    const prompt = `${CLUSTER_ENRICHMENT_PROMPT}

ARTÍCULOS A ANALIZAR:
${articlesContext}

Analiza estos artículos y proporciona el análisis completo en formato JSON.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista experto de inteligencia geopolítica y mercados. Responde siempre en formato JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error('No content in OpenAI response')
      return null
    }

    const analysis = JSON.parse(content) as ClusterEnrichment

    // Validate and clean the analysis
    return {
      canonical_title: analysis.canonical_title || cluster.canonical_title,
      summary: analysis.summary || '',
      countries: Array.isArray(analysis.countries) ? analysis.countries.slice(0, 15) : [],
      topics: Array.isArray(analysis.topics) ? analysis.topics.slice(0, 15) : [],
      entities: {
        people: Array.isArray(analysis.entities?.people) ? analysis.entities.people.slice(0, 20) : [],
        organizations: Array.isArray(analysis.entities?.organizations)
          ? analysis.entities.organizations.slice(0, 20)
          : [],
        locations: Array.isArray(analysis.entities?.locations) ? analysis.entities.locations.slice(0, 20) : [],
        events: Array.isArray(analysis.entities?.events) ? analysis.entities.events.slice(0, 10) : [],
      },
      severity: Math.max(0, Math.min(100, analysis.severity || 50)),
      confidence: Math.max(0, Math.min(100, analysis.confidence || 50)),
      geopolitical_implications: Array.isArray(analysis.geopolitical_implications)
        ? analysis.geopolitical_implications.slice(0, 10)
        : [],
      key_signals: Array.isArray(analysis.key_signals) ? analysis.key_signals.slice(0, 10) : [],
      market_impact: analysis.market_impact || undefined,
      map_data: analysis.map_data || undefined,
    }
  } catch (error) {
    console.error('Error enriching cluster with AI:', error)
    return null
  }
}

