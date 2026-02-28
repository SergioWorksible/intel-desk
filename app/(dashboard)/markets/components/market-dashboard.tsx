'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, AlertTriangle, Activity, DollarSign, Zap, BarChart3 } from 'lucide-react'
import type { Database } from '@/types/database'

type MarketSymbol = Database['public']['Tables']['market_symbols']['Row']
type MarketQuote = Database['public']['Tables']['market_quotes']['Row']

interface MarketDashboardProps {
  symbols: MarketSymbol[]
  quotes: Record<string, MarketQuote>
}

export function MarketDashboard({ symbols, quotes }: MarketDashboardProps) {
  const metrics = useMemo(() => {
    const quotesList = Object.values(quotes)
    const activeSymbols = symbols.filter((s) => quotes[s.id])

    // Calculate metrics
    const totalSymbols = activeSymbols.length
    const positiveChanges = quotesList.filter((q) => q.change_percent > 0).length
    const negativeChanges = quotesList.filter((q) => q.change_percent < 0).length
    const avgChange = quotesList.length > 0
      ? quotesList.reduce((sum, q) => sum + q.change_percent, 0) / quotesList.length
      : 0

    // Find biggest movers
    const biggestGainers = [...quotesList]
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, 3)
      .map((q) => {
        const symbol = symbols.find((s: any) => s.id === q.symbol_id)
        return { symbol: symbol?.symbol || '', change: q.change_percent, quote: q }
      })

    const biggestLosers = [...quotesList]
      .sort((a, b) => a.change_percent - b.change_percent)
      .slice(0, 3)
      .map((q) => {
        const symbol = symbols.find((s: any) => s.id === q.symbol_id)
        return { symbol: symbol?.symbol || '', change: q.change_percent, quote: q }
      })

    // High volatility (change > 5%)
    const highVolatility = quotesList.filter((q) => Math.abs(q.change_percent) > 5).length

    return {
      totalSymbols,
      positiveChanges,
      negativeChanges,
      avgChange,
      biggestGainers,
      biggestLosers,
      highVolatility,
    }
  }, [symbols, quotes])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total symbols */}
      <Card className="intel-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-intel-muted mb-1">Total activos</p>
              <p className="text-2xl font-mono font-bold text-intel-text">
                {metrics.totalSymbols}
              </p>
            </div>
            <Activity className="h-8 w-8 text-intel-accent opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Average change */}
      <Card className="intel-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-intel-muted mb-1">Cambio promedio</p>
              <p
                className={`text-2xl font-mono font-bold flex items-center gap-1 ${
                  metrics.avgChange > 0
                    ? 'text-emerald-400'
                    : metrics.avgChange < 0
                    ? 'text-red-400'
                    : 'text-intel-text'
                }`}
              >
                {metrics.avgChange > 0 ? '+' : ''}
                {metrics.avgChange.toFixed(2)}%
              </p>
            </div>
            {metrics.avgChange > 0 ? (
              <TrendingUp className="h-8 w-8 text-emerald-400 opacity-50" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-400 opacity-50" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Positive vs Negative */}
      <Card className="intel-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-intel-muted mb-1">Tendencia</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-mono text-emerald-400">
                    {metrics.positiveChanges}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-mono text-red-400">
                    {metrics.negativeChanges}
                  </span>
                </div>
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-intel-accent opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* High volatility */}
      <Card className="intel-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-intel-muted mb-1">Alta volatilidad</p>
              <p className="text-2xl font-mono font-bold text-intel-text">
                {metrics.highVolatility}
              </p>
              <p className="text-xs text-intel-muted mt-1">
                &gt;5% cambio
              </p>
            </div>
            <Zap className="h-8 w-8 text-amber-400 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Biggest gainers */}
      {metrics.biggestGainers.length > 0 && (
        <Card className="intel-card md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Mayores ganadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {metrics.biggestGainers.map((gainer, i) => (
                <div key={i} className="flex-1">
                  <p className="text-xs font-mono text-intel-text mb-1">{gainer.symbol}</p>
                  <p className="text-lg font-mono text-emerald-400">
                    +{gainer.change.toFixed(2)}%
                  </p>
                  <p className="text-xs text-intel-muted">
                    ${gainer.quote.price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Biggest losers */}
      {metrics.biggestLosers.length > 0 && (
        <Card className="intel-card md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              Mayores perdedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {metrics.biggestLosers.map((loser, i) => (
                <div key={i} className="flex-1">
                  <p className="text-xs font-mono text-intel-text mb-1">{loser.symbol}</p>
                  <p className="text-lg font-mono text-red-400">
                    {loser.change.toFixed(2)}%
                  </p>
                  <p className="text-xs text-intel-muted">
                    ${loser.quote.price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

