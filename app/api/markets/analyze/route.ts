import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMarketAnalysis } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { symbolIds, analysisType } = body

    if (!symbolIds || !Array.isArray(symbolIds) || symbolIds.length === 0) {
      return NextResponse.json({ error: 'symbolIds array is required' }, { status: 400 })
    }

    // Fetch symbols and their latest quotes
    const { data: symbols, error: symbolsError } = await supabase
      .from('market_symbols')
      .select('*')
      .in('id', symbolIds) as { data: Array<{ id: string; symbol: string; name: string; type: string; sector: string | null; country: string | null }> | null; error: any }

    if (symbolsError) {
      throw new Error(`Failed to fetch symbols: ${symbolsError.message}`)
    }

    const symbolsArray = symbols || []
    if (symbolsArray.length === 0) {
      return NextResponse.json({ error: 'No symbols found' }, { status: 404 })
    }

    // Fetch latest quotes
    const symbolIdsList = symbolsArray.map((s: any) => s.id)
    const { data: quotes } = await supabase
      .from('market_quotes')
      .select('*')
      .in('symbol_id', symbolIdsList)
      .order('timestamp', { ascending: false }) as { data: Array<{ symbol_id: string; price: number; change_percent: number; volume: number }> | null }

    // Group quotes by symbol_id (get latest)
    const latestQuotes: Record<string, any> = {}
    if (quotes) {
      quotes.forEach((quote: any) => {
        if (!latestQuotes[quote.symbol_id]) {
          latestQuotes[quote.symbol_id] = quote
        }
      })
    }

    // Fetch OHLCV data for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: ohlcv } = await supabase
      .from('market_ohlcv')
      .select('*')
      .in('symbol_id', symbolIdsList)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true }) as { data: Array<{ symbol_id: string; date: string; close: number; volume: number }> | null }

    // Group OHLCV by symbol_id
    const ohlcvBySymbol: Record<string, any[]> = {}
    if (ohlcv) {
      ohlcv.forEach((record: any) => {
        if (!ohlcvBySymbol[record.symbol_id]) {
          ohlcvBySymbol[record.symbol_id] = []
        }
        ohlcvBySymbol[record.symbol_id].push(record)
      })
    }

    // Fetch linked events
    const { data: eventLinks } = await supabase
      .from('market_event_links')
      .select('*, clusters(*)')
      .in('symbol_id', symbolIdsList)
      .order('created_at', { ascending: false }) as { data: Array<{ symbol_id: string; rationale: string; clusters: { canonical_title?: string; severity?: number } | null }> | null }

    // Prepare data for AI analysis
    const marketData = symbolsArray.map((symbol: any) => {
      const quote = latestQuotes[symbol.id]
      const historical = ohlcvBySymbol[symbol.id] || []
      const events = eventLinks?.filter((link: any) => link.symbol_id === symbol.id) || []

      return {
        symbol: symbol.symbol,
        name: symbol.name,
        type: symbol.type,
        sector: symbol.sector,
        country: symbol.country,
        currentPrice: quote?.price || null,
        changePercent: quote?.change_percent || null,
        volume: quote?.volume || null,
        historical: historical.map((h: any) => ({
          date: h.date,
          close: h.close,
          volume: h.volume,
        })),
        events: events.map((e: any) => ({
          title: (e.clusters as any)?.canonical_title || '',
          severity: (e.clusters as any)?.severity || 0,
          rationale: e.rationale || '',
        })),
      }
    })

    // Generate AI analysis
    const analysis = await generateMarketAnalysis(marketData, analysisType || 'trend')

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Market analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

