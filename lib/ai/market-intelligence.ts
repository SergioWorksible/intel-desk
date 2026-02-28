import { openai } from './index'
import type { Database } from '@/types/database'

type Cluster = Database['public']['Tables']['clusters']['Row']
type MarketSymbol = Database['public']['Tables']['market_symbols']['Row']
type MarketQuote = Database['public']['Tables']['market_quotes']['Row']

export interface MarketScenario {
  title: string
  description: string
  probability: number // 0-100
  timeframe: '24h' | '7d' | '30d' | '90d'
  impact: 'positive' | 'negative' | 'neutral'
  affected_symbols: string[]
  rationale: string
}

export interface MarketHypothesis {
  statement: string
  confidence: number // 0-100
  supporting_events: string[]
  contrary_signals: string[]
  actionable_insights: string[]
  risk_level: 'low' | 'medium' | 'high'
}

export interface TradingPlan {
  strategy: 'long' | 'short' | 'neutral' | 'hedge'
  symbols: string[]
  title?: string
  rationale: string
  entry_conditions: string[]
  exit_conditions: string[]
  risk_factors: string[]
  timeframe: string
  confidence: number
  potential_upside?: string
  stop_loss?: string
  position_size?: string
}

export interface MarketIntelligenceReport {
  generated_at: string
  summary: string
  key_trends: string[]
  scenarios: MarketScenario[]
  hypotheses: MarketHypothesis[]
  trading_plans: TradingPlan[]
  risk_alerts: {
    symbol: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    reason: string
    recommended_action: string
  }[]
}

/**
 * Generate comprehensive market intelligence based on geopolitical data
 */
export async function generateMarketIntelligence(
  clusters: Cluster[],
  marketSymbols: (MarketSymbol & { quote?: MarketQuote })[],
  marketEventLinks: Array<{
    symbol_id: string
    cluster_id: string
    rationale?: string
  }>,
  briefingItems: any[] = [],
  language: 'es' | 'en' = 'es'
): Promise<MarketIntelligenceReport> {
  // Prepare context for AI
  const topClusters = clusters
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 15)
    .map((c) => ({
      title: c.canonical_title,
      severity: c.severity,
      confidence: c.confidence,
      countries: c.countries,
      topics: c.topics,
      summary: c.summary,
    }))

  const symbolsWithLinks = marketSymbols
    .filter((s) =>
      marketEventLinks.some((link) => link.symbol_id === s.id)
    )
    .map((s) => ({
      symbol: s.symbol,
      name: s.name,
      type: s.type,
      sector: s.sector,
      country: s.country,
      price: s.quote?.price,
      change_percent: s.quote?.change_percent,
      linked_events: marketEventLinks
        .filter((link) => link.symbol_id === s.id)
        .map((link) => {
          const cluster = clusters.find((c) => c.id === link.cluster_id)
          return {
            title: cluster?.canonical_title,
            severity: cluster?.severity,
            rationale: link.rationale,
          }
        }),
    }))

  // Format briefing items for context
  const briefingContext = briefingItems.length > 0
    ? `\n# DAILY BRIEFING (Today's key intelligence items):\n${briefingItems.map((item, i) => 
        `[${i + 1}] ${item.title}\nFact: ${item.fact}\nWhy it matters: ${item.why_it_matters}\nSignals (72h): ${item.signals_72h?.join(', ') || 'N/A'}\nConfidence: ${item.confidence}%\nTopics: ${item.topics?.join(', ') || 'N/A'}\nCountries: ${item.countries?.join(', ') || 'N/A'}`
      ).join('\n\n')}`
    : ''

  const languageInstruction = language === 'es' 
    ? 'IMPORTANT: Generate ALL responses in Spanish (español). All text, summaries, scenarios, hypotheses, and recommendations must be in Spanish.'
    : 'IMPORTANT: Generate ALL responses in English. All text, summaries, scenarios, hypotheses, and recommendations must be in English.'

  const prompt = `You are a classified geopolitical intelligence analyst specializing in market intelligence. Analyze the following geopolitical events and market data to generate actionable intelligence.

${languageInstruction}

# GEOPOLITICAL EVENTS (Last 7 days, ordered by severity):
${JSON.stringify(topClusters, null, 2)}
${briefingContext}

# MARKET SYMBOLS WITH GEOPOLITICAL LINKS:
${JSON.stringify(symbolsWithLinks.slice(0, 30), null, 2)}

Generate a comprehensive market intelligence report in JSON format with the following structure:

{
  "summary": "Brief executive summary (2-3 sentences) of the current geopolitical-market landscape",
  "key_trends": ["Trend 1", "Trend 2", "Trend 3", "Trend 4", "Trend 5"],
  "scenarios": [
    {
      "title": "Scenario name",
      "description": "Detailed scenario description",
      "probability": 0-100,
      "timeframe": "24h" | "7d" | "30d" | "90d",
      "impact": "positive" | "negative" | "neutral",
      "affected_symbols": ["SYMBOL1", "SYMBOL2"],
      "rationale": "Why this scenario matters"
    }
  ],
  "hypotheses": [
    {
      "statement": "Clear, testable hypothesis statement",
      "confidence": 0-100,
      "supporting_events": ["Event 1", "Event 2"],
      "contrary_signals": ["Signal 1", "Signal 2"],
      "actionable_insights": ["Action 1", "Action 2"],
      "risk_level": "low" | "medium" | "high"
    }
  ],
  "trading_plans": [
    {
      "strategy": "long" | "short" | "neutral" | "hedge",
      "symbols": ["SYMBOL1", "SYMBOL2"],
      "title": "Clear, compelling title for this trading opportunity",
      "rationale": "Detailed explanation of why this strategy makes sense based on geopolitical events",
      "entry_conditions": ["Specific condition 1", "Specific condition 2"],
      "exit_conditions": ["Exit condition 1", "Exit condition 2"],
      "risk_factors": ["Risk 1", "Risk 2"],
      "timeframe": "Short/medium/long term description",
      "confidence": 0-100,
      "potential_upside": "Expected percentage gain or description",
      "stop_loss": "Recommended stop loss level or percentage",
      "position_size": "Recommended position size (conservative/moderate/aggressive)"
    }
  ],
  "risk_alerts": [
    {
      "symbol": "SYMBOL",
      "severity": "low" | "medium" | "high" | "critical",
      "reason": "Why this symbol is at risk",
      "recommended_action": "What to do about it"
    }
  ]
}

IMPORTANT GUIDELINES:
- Focus on ACTIONABLE intelligence, not generic observations
- Base scenarios on REAL geopolitical events from the data provided AND today's briefing
- Incorporate insights from the daily briefing into your analysis
- Be specific about symbols, sectors, and timeframes
- Include both opportunities AND risks
- Confidence/probability should reflect actual event severity and likelihood
- Generate 3-5 scenarios, 3-5 hypotheses, 5-8 trading plans, and 3-7 risk alerts
- Trading plans should be SPECIFIC and ACTIONABLE with clear entry/exit conditions
- Each trading plan MUST have a compelling, descriptive title (e.g., "Energy Sector Rally on Supply Disruption", "Defense Stocks Surge on Geopolitical Tensions")
- Include potential upside (e.g., "+15-25%", "Moderate upside potential"), stop loss recommendations (e.g., "-5%", "Below support at $X"), and position sizing guidance (e.g., "Conservative: 2-3%", "Moderate: 5-7%", "Aggressive: 10-15%")
- Focus on opportunities that are directly linked to geopolitical events from the briefing and clusters
- Prioritize high-confidence opportunities (60%+) with clear catalysts
- Make each plan feel like a professional investment recommendation with all necessary details
- Consider cascading effects (e.g., oil prices → energy stocks → inflation → indices)
- Think like a professional geopolitical risk analyst at a hedge fund
- Use the briefing items to understand the most critical real-time developments

Return ONLY valid JSON, no additional text. All text content must be in ${language === 'es' ? 'Spanish' : 'English'}.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            language === 'es'
              ? 'Eres un analista de inteligencia geopolítica clasificado especializado en inteligencia de mercados. Proporcionas insights accionables basados en datos y eventos geopolíticos en tiempo real. Responde SIEMPRE en español.'
              : 'You are a classified geopolitical intelligence analyst specializing in market intelligence. You provide actionable, data-driven insights based on real-time geopolitical events. Respond ALWAYS in English.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content in AI response')
    }

    const report = JSON.parse(content) as Omit<MarketIntelligenceReport, 'generated_at'>

    return {
      ...report,
      generated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error generating market intelligence:', error)
    throw error
  }
}

/**
 * Generate quick scenario analysis for a specific symbol
 */
export async function generateSymbolScenarios(
  symbol: MarketSymbol,
  linkedClusters: Cluster[],
  quote?: MarketQuote
): Promise<MarketScenario[]> {
  if (linkedClusters.length === 0) {
    return []
  }

  const prompt = `Analyze the following market symbol and its linked geopolitical events:

SYMBOL: ${symbol.symbol} (${symbol.name})
Sector: ${symbol.sector}
Country: ${symbol.country}
Current Price: ${quote ? `$${quote.price} (${quote.change_percent >= 0 ? '+' : ''}${quote.change_percent}%)` : 'N/A'}

LINKED GEOPOLITICAL EVENTS:
${linkedClusters.map((c) => `- ${c.canonical_title} (Severity: ${c.severity}, ${c.countries.join(', ')})`).join('\n')}

Generate 2-4 realistic scenarios for how these geopolitical events could affect this symbol in the near future.

Return JSON array of scenarios:
[
  {
    "title": "Scenario name",
    "description": "What could happen",
    "probability": 0-100,
    "timeframe": "24h" | "7d" | "30d" | "90d",
    "impact": "positive" | "negative" | "neutral",
    "affected_symbols": ["${symbol.symbol}"],
    "rationale": "Why this could happen"
  }
]

Be specific, realistic, and base scenarios on the actual events provided.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a geopolitical risk analyst. Provide realistic, actionable scenarios.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) return []

    const result = JSON.parse(content)
    return result.scenarios || result
  } catch (error) {
    console.error('Error generating symbol scenarios:', error)
    return []
  }
}

