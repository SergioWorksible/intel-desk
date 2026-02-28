'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Calendar,
  Globe,
  Building2,
  BarChart3,
  Newspaper,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import Link from 'next/link'
import { format } from 'date-fns'

export default function SymbolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const symbolId = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['symbol-detail', symbolId],
    queryFn: async () => {
      const response = await fetch(`/api/markets/symbol/${symbolId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch symbol details')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6">
        <Card className="intel-card">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-intel-muted mx-auto mb-4" />
            <h2 className="text-xl font-mono text-intel-text mb-2">
              Error al cargar símbolo
            </h2>
            <p className="text-sm text-intel-muted mb-4">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <Button variant="outline" onClick={() => router.push('/markets')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a mercados
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { symbol, quote, ohlcv, candles, profile, news, eventLinks } = data

  // Prepare chart data
  const chartData = ohlcv && ohlcv.length > 0
    ? ohlcv.map((item: any) => ({
        date: format(new Date(item.date), 'MMM dd'),
        price: item.close,
        open: item.open,
        high: item.high,
        low: item.low,
        volume: item.volume,
      }))
    : candles && candles.c && candles.c.length > 0
    ? candles.c.map((close: number, i: number) => ({
        date: format(new Date(candles.t[i] * 1000), 'MMM dd'),
        price: close,
        open: candles.o[i],
        high: candles.h[i],
        low: candles.l[i],
        volume: candles.v[i],
      }))
    : []

  const change = quote?.change_percent || 0
  const isPositive = change > 0
  const TrendIcon = isPositive ? TrendingUp : change < 0 ? TrendingDown : null

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/markets')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-intel-text">
                {symbol.symbol}
              </h1>
              <Badge variant="outline" className="font-mono shrink-0">
                {symbol.type.toUpperCase()}
              </Badge>
              {symbol.sector && (
                <Badge variant="outline" className="bg-intel-border/50 shrink-0">
                  {symbol.sector}
                </Badge>
              )}
            </div>
            <p className="text-sm text-intel-muted mt-1 truncate">{symbol.name}</p>
          </div>
        </div>
        {quote && (
          <div className="text-left sm:text-right shrink-0">
            <div className="flex items-center gap-2 sm:justify-end">
              <span className="text-2xl font-mono font-bold text-intel-text">
                ${quote.price.toFixed(2)}
              </span>
              {TrendIcon && (
                <TrendIcon
                  className={`h-5 w-5 shrink-0 ${
                    isPositive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                />
              )}
            </div>
            <div
              className={`text-sm font-mono ${
                isPositive
                  ? 'text-emerald-400'
                  : change < 0
                  ? 'text-red-400'
                  : 'text-intel-muted'
              }`}
            >
              {isPositive ? '+' : ''}
              {change.toFixed(2)}% ({isPositive ? '+' : ''}
              {quote.change.toFixed(2)})
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          {chartData.length > 0 ? (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-intel-accent" />
                  Precio histórico (30 días)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={isPositive ? '#10b981' : '#ef4444'}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={isPositive ? '#10b981' : '#ef4444'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      fontSize={12}
                      tick={{ fill: '#888' }}
                    />
                    <YAxis
                      stroke="#888"
                      fontSize={12}
                      tick={{ fill: '#888' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2a2a3e',
                        borderRadius: '4px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#10b981' : '#ef4444'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-intel-accent" />
                  Precio histórico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-intel-muted">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay datos históricos disponibles</p>
                  <p className="text-xs mt-1">Los datos se actualizarán automáticamente</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Profile */}
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <Building2 className="h-4 w-4 text-intel-accent" />
                Información de la empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile ? (
                <>
                  {profile.name && (
                    <div>
                      <p className="text-xs text-intel-muted mb-1">Nombre</p>
                      <p className="text-sm text-intel-text">{profile.name}</p>
                    </div>
                  )}
                  {profile.finnhubIndustry && (
                    <div>
                      <p className="text-xs text-intel-muted mb-1">Industria</p>
                      <p className="text-sm text-intel-text">{profile.finnhubIndustry}</p>
                    </div>
                  )}
                  {profile.country && (
                    <div>
                      <p className="text-xs text-intel-muted mb-1">País</p>
                      <p className="text-sm text-intel-text flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        {profile.country}
                      </p>
                    </div>
                  )}
                  {profile.weburl && (
                    <div>
                      <p className="text-xs text-intel-muted mb-1">Sitio web</p>
                      <a
                        href={profile.weburl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-intel-accent hover:underline flex items-center gap-1 break-all"
                      >
                        {profile.weburl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {profile.marketCapitalization && (
                    <div>
                      <p className="text-xs text-intel-muted mb-1">Capitalización de mercado</p>
                      <p className="text-sm text-intel-text font-mono">
                        ${(profile.marketCapitalization / 1e9).toFixed(2)}B
                      </p>
                    </div>
                  )}
                  {!profile.name && !profile.finnhubIndustry && !profile.country && !profile.weburl && !profile.marketCapitalization && (
                    <div className="text-center py-4 text-intel-muted">
                      <p className="text-xs">No hay información adicional disponible</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-intel-muted">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Cargando información de la empresa...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* News */}
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-intel-accent" />
                Noticias recientes ({news.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {news.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-4">
                    {news.slice(0, 20).map((item: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 rounded border border-intel-border hover:bg-intel-border/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-semibold text-intel-text flex-1 leading-snug">
                            {item.headline}
                          </h4>
                          {item.datetime && (
                            <span className="text-xs text-intel-muted whitespace-nowrap shrink-0 ml-2">
                              {format(new Date(item.datetime * 1000), 'dd MMM')}
                            </span>
                          )}
                        </div>
                        {item.summary && (
                          <p className="text-xs text-intel-muted line-clamp-3 mb-2 leading-relaxed">
                            {item.summary}
                          </p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-intel-accent hover:underline flex items-center gap-1 w-fit"
                          >
                            Leer más
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-intel-muted">
                  <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay noticias disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Details */}
          {quote && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base font-mono">Cotización actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-intel-muted">Precio</span>
                  <span className="text-sm font-mono text-intel-text">${quote.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-intel-muted">Apertura</span>
                  <span className="text-sm font-mono text-intel-text">${quote.open.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-intel-muted">Máximo</span>
                  <span className="text-sm font-mono text-emerald-400">${quote.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-intel-muted">Mínimo</span>
                  <span className="text-sm font-mono text-red-400">${quote.low.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-intel-muted">Cierre anterior</span>
                  <span className="text-sm font-mono text-intel-text">
                    ${quote.previous_close.toFixed(2)}
                  </span>
                </div>
                {quote.timestamp && (
                  <div className="pt-2 border-t border-intel-border">
                    <div className="flex items-center gap-2 text-xs text-intel-muted">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(quote.timestamp), 'dd MMM yyyy HH:mm')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Geopolitical Events */}
          {eventLinks && eventLinks.length > 0 && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-intel-accent" />
                  Eventos geopolíticos vinculados ({eventLinks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {eventLinks.map((link: any) => {
                      const cluster = link.clusters
                      if (!cluster) return null
                      return (
                        <Link
                          key={link.id}
                          href={`/clusters/${cluster.id}`}
                          className="block p-3 rounded border border-intel-border hover:bg-intel-border/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-xs font-semibold text-intel-text flex-1">
                              {cluster.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                cluster.severity === 'high'
                                  ? 'border-red-400 text-red-400'
                                  : cluster.severity === 'medium'
                                  ? 'border-amber-400 text-amber-400'
                                  : 'border-intel-muted text-intel-muted'
                              }`}
                            >
                              {cluster.severity}
                            </Badge>
                          </div>
                          {cluster.summary && (
                            <p className="text-xs text-intel-muted line-clamp-2 mt-1">
                              {cluster.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-2 text-xs text-intel-muted">
                            <LinkIcon className="h-3 w-3" />
                            Ver evento
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
