import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MARKET_ANALYSIS_SYSTEM_PROMPT = `Eres un analista de inteligencia geopolítica especializado en mercados financieros para Intel Desk.
Analizas movimientos de mercado como sensores geopolíticos, no como oportunidades de inversión.

Tu análisis debe seguir esta estructura JSON:
{
  "summary": "Resumen ejecutivo del análisis",
  "trends": ["Tendencia 1", "Tendencia 2"],
  "geopolitical_signals": [
    {
      "symbol": "Símbolo",
      "signal": "Señal geopolítica identificada",
      "confidence": 75,
      "rationale": "Explicación"
    }
  ],
  "correlations": [
    {
      "symbols": ["SYM1", "SYM2"],
      "correlation": 0.85,
      "interpretation": "Interpretación de la correlación"
    }
  ],
  "volatility_analysis": {
    "high_volatility": ["Símbolos con alta volatilidad"],
    "low_volatility": ["Símbolos con baja volatilidad"],
    "interpretation": "Interpretación de la volatilidad"
  },
  "event_impact": [
    {
      "event": "Título del evento",
      "affected_symbols": ["SYM1"],
      "impact": "Alto/Medio/Bajo",
      "rationale": "Por qué este evento afecta estos mercados"
    }
  ],
  "risk_assessment": {
    "overall": "Alto/Medio/Bajo",
    "factors": ["Factor 1", "Factor 2"],
    "recommendations": ["Recomendación 1"]
  },
  "confidence": {
    "score": 75,
    "rationale": "Explicación del nivel de confianza"
  }
}

REGLAS CRÍTICAS:
1. NO proporcionar consejos de inversión
2. Enfocarse en señales geopolíticas, no en predicciones de precios
3. Usar solo los datos proporcionados
4. Ser específico y basado en evidencia
5. Identificar correlaciones entre eventos geopolíticos y movimientos de mercado
6. La confianza debe reflejar la calidad de los datos disponibles`

export interface MarketAnalysis {
  summary: string
  trends: string[]
  geopolitical_signals: Array<{
    symbol: string
    signal: string
    confidence: number
    rationale: string
  }>
  correlations: Array<{
    symbols: string[]
    correlation: number
    interpretation: string
  }>
  volatility_analysis: {
    high_volatility: string[]
    low_volatility: string[]
    interpretation: string
  }
  event_impact: Array<{
    event: string
    affected_symbols: string[]
    impact: string
    rationale: string
  }>
  risk_assessment: {
    overall: string
    factors: string[]
    recommendations: string[]
  }
  confidence: {
    score: number
    rationale: string
  }
}

export async function generateMarketAnalysis(
  marketData: any[],
  analysisType: 'trend' | 'correlation' | 'volatility' | 'comprehensive' = 'comprehensive'
): Promise<MarketAnalysis> {
  try {
    const dataContext = marketData.map((data) => {
      const priceChange = data.changePercent ? `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%` : 'N/A'
      const eventsList = data.events.length > 0
        ? data.events.map((e: any) => `- ${e.title} (Severidad: ${e.severity})`).join('\n')
        : 'Ninguno'

      return `
Símbolo: ${data.symbol} (${data.name})
Tipo: ${data.type} | Sector: ${data.sector || 'N/A'} | País: ${data.country || 'N/A'}
Precio actual: ${data.currentPrice ? `$${data.currentPrice.toFixed(2)}` : 'N/A'}
Cambio: ${priceChange}
Volumen: ${data.volume ? data.volume.toLocaleString() : 'N/A'}
Datos históricos: ${data.historical.length} días disponibles
Eventos geopolíticos vinculados:
${eventsList}
`
    }).join('\n---\n')

    const userPrompt = `Analiza los siguientes datos de mercado como sensores geopolíticos:

${dataContext}

Tipo de análisis solicitado: ${analysisType}

Proporciona un análisis completo enfocado en:
1. Identificar tendencias y patrones en los movimientos de mercado
2. Relacionar movimientos con eventos geopolíticos vinculados
3. Analizar correlaciones entre diferentes activos
4. Evaluar volatilidad y su significado geopolítico
5. Identificar señales de riesgo geopolítico

Responde en formato JSON siguiendo la estructura especificada.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: MARKET_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI')
    }

    const parsed = JSON.parse(content) as MarketAnalysis

    // Validate response structure
    if (!parsed.summary || !parsed.confidence?.score) {
      throw new Error('Invalid response structure')
    }

    return parsed
  } catch (error) {
    console.error('Market Analysis AI Error:', error)
    
    // Return fallback response
    return {
      summary: 'No se pudo generar análisis automático. Datos insuficientes o servicio no disponible.',
      trends: [],
      geopolitical_signals: [],
      correlations: [],
      volatility_analysis: {
        high_volatility: [],
        low_volatility: [],
        interpretation: 'Análisis de volatilidad no disponible',
      },
      event_impact: [],
      risk_assessment: {
        overall: 'Desconocido',
        factors: [],
        recommendations: [],
      },
      confidence: {
        score: 0,
        rationale: 'No se pudo procesar la solicitud',
      },
    }
  }
}

/**
 * Automatically determine which market symbols are relevant to a geopolitical event
 */
export async function generateMarketEventLinks(
  cluster: {
    canonical_title: string
    summary: string | null
    topics: string[]
    countries: string[]
    severity: number
  },
  symbols: Array<{
    id: string
    symbol: string
    name: string
    type: string
    sector: string | null
    country: string | null
  }>
): Promise<Array<{
  symbol: string
  rationale: string
  impact_assessment: string
}>> {
  try {
    const clusterContext = `
Evento: ${cluster.canonical_title}
Resumen: ${cluster.summary || 'N/A'}
Temas: ${cluster.topics.join(', ')}
Países afectados: ${cluster.countries.join(', ')}
Severidad: ${cluster.severity}/100
`

    const symbolsList = symbols
      .slice(0, 100) // Limit to avoid token limits
      .map((s) => `${s.symbol} (${s.name}) - Tipo: ${s.type}, Sector: ${s.sector || 'N/A'}, País: ${s.country || 'N/A'}`)
      .join('\n')

    const userPrompt = `Analiza este evento geopolítico y determina qué símbolos de mercado son relevantes:

${clusterContext}

Símbolos disponibles:
${symbolsList}

Responde en formato JSON con un array de objetos:
[{
  "symbol": "SYMBOL",
  "rationale": "Por qué este evento afecta este símbolo",
  "impact_assessment": "Evaluación del impacto (Alto/Medio/Bajo)"
}]

Solo incluye símbolos que tengan una conexión clara y directa con el evento. Máximo 10 símbolos más relevantes.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Eres un analista de inteligencia geopolítica especializado en vincular eventos con movimientos de mercado.
Identifica símbolos de mercado que funcionan como sensores geopolíticos para eventos específicos.
Considera:
- Sector económico afectado (energía, defensa, tecnología, materias primas, etc.)
- Países involucrados y sus empresas/índices
- Temas del evento (sanctions, conflict, trade, etc.)
- Tipo de activo (stocks, commodities, forex, indices)

Sé específico y basado en evidencia. Solo vincula cuando haya una conexión clara.`,
        },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return []
    }

    const parsed = JSON.parse(content)
    const links = Array.isArray(parsed) ? parsed : parsed.links || parsed.symbols || []

    return links.slice(0, 10) // Limit to 10 most relevant
  } catch (error) {
    console.error('Market Event Links AI Error:', error)
    return []
  }
}

