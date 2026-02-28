import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getQuote, getCandles } from '@/lib/markets/finnhub'

export const dynamic = 'force-dynamic'

/**
 * Update market data for all symbols in watchlist
 * This should be called periodically (e.g., every 5-15 minutes)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    const manualTrigger = request.headers.get('x-manual-trigger')
    
    if (!manualTrigger && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const results = {
      symbols_processed: 0,
      quotes_updated: 0,
      ohlcv_updated: 0,
      errors: [] as string[],
    }

    // Get all active symbols
    const { data: symbols, error: symbolsError } = await supabase
      .from('market_symbols')
      .select('*')
      .eq('is_active', true)

    if (symbolsError) {
      throw new Error(`Failed to fetch symbols: ${symbolsError.message}`)
    }

    if (!symbols || symbols.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No symbols to update',
        results,
      })
    }

    // Calculate estimated time
    // Quotes: 1 per symbol
    // Candles: Only for symbols with recent quotes (saves API calls)
    const quoteRequests = symbols.length
    const estimatedMinutes = Math.ceil(quoteRequests / 60)
    console.log(`Updating ${symbols.length} symbols. Estimated time: ~${estimatedMinutes} minute(s) for quotes (${quoteRequests} API calls). Candles will be updated only for symbols with recent quotes.`)

    // Process symbols in batches to avoid timeout
    // Prioritize quotes (more important) over candles
    const batchSize = 30 // Process 30 symbols at a time
    const batches = []
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize))
    }

    // First pass: Update quotes for all symbols (priority)
    console.log('Phase 1: Updating quotes...')
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (symbol: any) => {
          try {
            const quote = await getQuote(symbol.symbol)
            
            if (quote && quote.c > 0) {
              // Delete old quotes for this symbol from same provider (keep only latest)
              await supabase
                .from('market_quotes')
                .delete()
                .eq('symbol_id', symbol.id)
                .eq('provider', 'finnhub')

              // Insert new quote
              const { error: quoteError } = await supabase
                .from('market_quotes')
                .insert({
                  symbol_id: symbol.id,
                  price: quote.c,
                  change: quote.d,
                  change_percent: quote.dp,
                  open: quote.o,
                  high: quote.h,
                  low: quote.l,
                  previous_close: quote.pc,
                  timestamp: new Date(quote.t * 1000).toISOString(),
                  provider: 'finnhub',
                } as any)

              if (!quoteError) {
                results.quotes_updated++
              } else {
                results.errors.push(`${symbol.symbol}: Quote insert error - ${quoteError.message}`)
              }
            } else if (quote) {
              results.errors.push(`${symbol.symbol}: Invalid quote data (price: ${quote.c})`)
            }
            results.symbols_processed++
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            results.errors.push(`${symbol.symbol}: Quote error - ${message}`)
          }
        })
      )
    }

    // Second pass: Update candles (less critical, can be done less frequently)
    // Only update candles for symbols that have recent quotes (last 24 hours)
    console.log('Phase 2: Updating candles for symbols with recent quotes...')
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (symbol: any) => {
          try {
            // Check if symbol has a recent quote
            const { data: recentQuote } = await supabase
              .from('market_quotes')
              .select('timestamp')
              .eq('symbol_id', symbol.id)
              .gte('timestamp', oneDayAgo)
              .limit(1)

            // Only update candles if we have a recent quote (saves API calls)
            if (!recentQuote || recentQuote.length === 0) {
              return
            }

            // Get historical data (last 30 days)
            const to = Math.floor(Date.now() / 1000)
            const from = to - 30 * 24 * 60 * 60 // 30 days ago
            
            const candles = await getCandles(symbol.symbol, 'D', from, to)
            
            if (candles && candles.c.length > 0) {
              // Insert OHLCV data
              const ohlcvData = candles.c.map((close: number, i: number) => ({
                symbol_id: symbol.id,
                date: new Date(candles.t[i] * 1000).toISOString().split('T')[0],
                open: candles.o[i],
                high: candles.h[i],
                low: candles.l[i],
                close: close,
                volume: candles.v[i],
              }))

              // Upsert in batches
              for (const ohlcv of ohlcvData) {
                const { error: ohlcvError } = await supabase
                  .from('market_ohlcv')
                  .upsert({
                    ...ohlcv,
                    provider: 'finnhub',
                  } as any, {
                    onConflict: 'symbol_id,date,provider',
                  })

                if (!ohlcvError) {
                  results.ohlcv_updated++
                }
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            results.errors.push(`${symbol.symbol}: Candles error - ${message}`)
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Market update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Allow GET in development for testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: {
      ...Object.fromEntries(request.headers),
      'x-manual-trigger': 'true',
    },
  }))
}

