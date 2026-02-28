import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateMarketIntelligence } from '@/lib/ai/market-intelligence'

export const dynamic = 'force-dynamic'

/**
 * Generate market intelligence report based on geopolitical data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Parse request body for language preference
    let language: 'es' | 'en' = 'es' // Default to Spanish
    try {
      const body = await request.json().catch(() => ({}))
      if (body.language && (body.language === 'es' || body.language === 'en')) {
        language = body.language
      }
    } catch {
      // Body is empty or invalid, use default
    }

    // Get today's briefing
    const today = new Date().toISOString().split('T')[0]
    const { data: briefing } = await supabase
      .from('briefings')
      .select('*')
      .eq('date', today)
      .single()

    // Get recent clusters (last 7 days)
    const { data: clusters, error: clustersError } = await supabase
      .from('clusters')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('severity', { ascending: false })
      .limit(50)

    if (clustersError) {
      console.error('Error fetching clusters:', clustersError)
      return NextResponse.json(
        { error: 'Failed to fetch geopolitical events' },
        { status: 500 }
      )
    }

    // Get active market symbols
    const { data: symbols, error: symbolsError } = await supabase
      .from('market_symbols')
      .select('*')
      .eq('is_active', true)
      .limit(200)

    if (symbolsError) {
      console.error('Error fetching symbols:', symbolsError)
      return NextResponse.json(
        { error: 'Failed to fetch market symbols' },
        { status: 500 }
      )
    }

    // Get latest quotes for symbols
    const symbolsArray = symbols || []
    const symbolsWithQuotes = await Promise.all(
      symbolsArray.map(async (symbol: any) => {
        const { data: quote } = await supabase
          .from('market_quotes')
          .select('*')
          .eq('symbol_id', symbol.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()

        return { ...symbol, quote: quote || undefined } as any
      })
    )

    // Get market event links
    const { data: eventLinks } = await supabase
      .from('market_event_links')
      .select('*')
      .in(
        'cluster_id',
        (clusters || []).map((c: any) => c.id)
      )

    // Generate intelligence report with briefing and language
    const briefingData = briefing as { items?: any[] } | null
    const report = await generateMarketIntelligence(
      clusters || [],
      symbolsWithQuotes,
      eventLinks || [],
      briefingData?.items || [],
      language
    )

    // Log generation
    await supabase.from('audit_logs').insert({
      action: 'market_intelligence_generated',
      details: {
        clusters_analyzed: clusters?.length || 0,
        symbols_analyzed: symbolsWithQuotes?.length || 0,
        scenarios_generated: report.scenarios.length,
      } as any,
    } as any)

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating market intelligence:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

