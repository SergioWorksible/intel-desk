import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyProfile, getCompanyNews, getCandles } from '@/lib/markets/finnhub'

export const dynamic = 'force-dynamic'

/**
 * Get detailed symbol data including profile, news, and historical data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()
    const symbolId = params.id

    // Get symbol from database
    const { data: symbol, error: symbolError } = await supabase
      .from('market_symbols')
      .select('*')
      .eq('id', symbolId)
      .single() as { data: { symbol: string } | null; error: any }

    if (symbolError || !symbol) {
      return NextResponse.json(
        { error: 'Symbol not found' },
        { status: 404 }
      )
    }

    const symbolData = symbol as { symbol: string }

    // Get latest quote
    const { data: quotes } = await supabase
      .from('market_quotes')
      .select('*')
      .eq('symbol_id', symbolId)
      .eq('provider', 'finnhub')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    // Get historical OHLCV data (last 30 days)
    const { data: ohlcv } = await supabase
      .from('market_ohlcv')
      .select('*')
      .eq('symbol_id', symbolId)
      .eq('provider', 'finnhub')
      .order('date', { ascending: true })
      .limit(30)

    // Get linked geopolitical events
    const { data: eventLinks } = await supabase
      .from('market_event_links')
      .select(`
        *,
        clusters (
          id,
          title,
          summary,
          severity,
          created_at
        )
      `)
      .eq('symbol_id', symbolId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch additional data from Finnhub
    const [profile, news, candlesData] = await Promise.all([
      getCompanyProfile(symbolData.symbol),
      (async () => {
        // Get news from last 7 days
        const to = new Date()
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]
        return getCompanyNews(symbolData.symbol, fromStr, toStr)
      })(),
      // Get historical candles from Finnhub (last 30 days) if not in DB
      (async () => {
        if (!ohlcv || ohlcv.length === 0) {
          const to = Math.floor(Date.now() / 1000)
          const from = to - 30 * 24 * 60 * 60
          return getCandles(symbolData.symbol, 'D', from, to)
        }
        return null
      })(),
    ])

    return NextResponse.json({
      symbol,
      quote: quotes || null,
      ohlcv: ohlcv || [],
      candles: candlesData,
      profile,
      news: news || [],
      eventLinks: eventLinks || [],
    })
  } catch (error) {
    console.error('Error fetching symbol details:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

