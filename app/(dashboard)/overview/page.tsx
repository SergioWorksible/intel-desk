'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonCard, SkeletonChart } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatRelativeTime, getConfidenceLevel, getSeverityColor } from '@/lib/utils'
import { RefreshCw, Loader2, Download } from 'lucide-react'
import { InfoDropdown } from '@/components/ui/info-dropdown'
import { PerplexityNewsWidget } from '@/components/dashboard/perplexity-news-widget'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Trend = 'up' | 'down' | 'stable'

function KpiRow({
  label,
  icon: Icon,
  value,
  unit,
  trend,
  hint,
}: {
  label: string
  icon: typeof Globe
  value: string | number
  unit?: string
  trend: Trend
  hint?: string
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-intel-muted'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-intel-border/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intel-border">
        <Icon className="h-5 w-5 text-intel-text" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono uppercase text-intel-muted truncate">{label}</p>
        {hint && <p className="text-[11px] text-intel-muted/80 truncate">{hint}</p>}
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono font-semibold text-intel-text tabular-nums">
            {value}
            {unit ? <span className="text-xs text-intel-muted ml-1">{unit}</span> : null}
          </span>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </div>
      </div>
    </div>
  )
}

function trendFromDelta(delta: number, stableBand = 0): Trend {
  if (Math.abs(delta) <= stableBand) return 'stable'
  return delta > 0 ? 'up' : 'down'
}

function safeAvg(nums: number[]) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function uniqueCount(arr: Array<string[] | null | undefined>) {
  const set = new Set<string>()
  for (const entry of arr) {
    if (!entry) continue
    for (const v of entry) set.add(v)
  }
  return set.size
}

function ClusterCard({
  cluster,
}: {
  cluster: {
    id: string
    canonical_title: string
    countries: string[]
    topics: string[]
    severity: number
    confidence: number
    article_count: number
    updated_at: string
  }
}) {
  return (
    <Link href={`/clusters/${cluster.id}`}>
      <Card className="intel-card hover:border-intel-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-intel-text line-clamp-2 mb-2">
                {cluster.canonical_title}
              </h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {cluster.countries.slice(0, 3).map((country: string) => (
                  <Badge key={country} variant="outline" className="text-xs">
                    {country}
                  </Badge>
                ))}
                {cluster.countries.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{cluster.countries.length - 3}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-intel-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(cluster.updated_at)}
                </span>
                <span>{cluster.article_count} sources</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getSeverityColor(cluster.severity)}>
                {cluster.severity >= 70 ? 'HIGH' : cluster.severity >= 40 ? 'MED' : 'LOW'}
              </Badge>
              <div className="text-xs text-intel-muted">
                <span
                  className={
                    getConfidenceLevel(cluster.confidence) === 'high'
                      ? 'text-emerald-400'
                      : getConfidenceLevel(cluster.confidence) === 'medium'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }
                >
                  {cluster.confidence}%
                </span>{' '}
                conf
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function OverviewPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [sitrepLanguage, setSitrepLanguage] = useState<string>('es')

  // Ingest articles mutation
  const ingestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cron/ingest', {
        method: 'POST',
        headers: { 'x-manual-trigger': 'true' },
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to ingest articles')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clusters', 'recent'] })
      queryClient.invalidateQueries({ queryKey: ['briefing', 'today'] })
      toast({
        title: 'Artículos obtenidos',
        description: `${data.results?.articles_new || 0} artículos nuevos, ${data.results?.clusters_created || 0} clusters creados`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error al obtener artículos',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  // Generate briefing mutation
  const generateBriefingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/briefing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate briefing')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['briefing', 'today'] })
      toast({
        title: 'Briefing regenerado',
        description: `${data.briefing?.items_count || 0} items generados`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error al regenerar briefing',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  // Fetch recent clusters
  const { data: clusters, isLoading: clustersLoading } = useQuery({
    queryKey: ['clusters', 'recent'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    },
  })

  // Fetch clusters for situational awareness (last 48h window)
  const { data: clusters48h } = useQuery({
    queryKey: ['clusters', 'situational-awareness', '48h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('id,canonical_title,severity,confidence,article_count,countries,created_at,updated_at')
        .gte('updated_at', since)
        .order('severity', { ascending: false })
        .limit(200)

      if (error) throw error
      return data || []
    },
  })

  const posture = (() => {
    const now = Date.now()
    const oneH = 60 * 60 * 1000
    const oneD = 24 * oneH

    const list = clusters48h || []
    const last1h = list.filter((c: any) => now - new Date(c.updated_at).getTime() <= oneH)
    const prev1h = list.filter((c: any) => {
      const dt = now - new Date(c.updated_at).getTime()
      return dt > oneH && dt <= 2 * oneH
    })

    const last24h = list.filter((c: any) => now - new Date(c.updated_at).getTime() <= oneD)
    const prev24h = list.filter((c: any) => {
      const dt = now - new Date(c.updated_at).getTime()
      return dt > oneD && dt <= 2 * oneD
    })

    const hpLast = last24h.filter((c: any) => (c.severity ?? 0) >= 80)
    const hpPrev = prev24h.filter((c: any) => (c.severity ?? 0) >= 80)

    const confLast = safeAvg(last24h.map((c: any) => Number(c.confidence ?? 0)))
    const confPrev = safeAvg(prev24h.map((c: any) => Number(c.confidence ?? 0)))

    const srcLast = safeAvg(last24h.map((c: any) => Number(c.article_count ?? 0)))
    const srcPrev = safeAvg(prev24h.map((c: any) => Number(c.article_count ?? 0)))

    const geoLast = uniqueCount(last24h.map((c: any) => c.countries))
    const geoPrev = uniqueCount(prev24h.map((c: any) => c.countries))

    return {
      tempo_1h: last1h.length,
      tempo_trend: trendFromDelta(last1h.length - prev1h.length, 0),

      high_priority_24h: hpLast.length,
      high_priority_trend: trendFromDelta(hpLast.length - hpPrev.length, 0),

      confidence_24h: Math.round(confLast),
      confidence_trend: trendFromDelta(confLast - confPrev, 1),

      source_density_24h: Number(srcLast.toFixed(1)),
      source_density_trend: trendFromDelta(srcLast - srcPrev, 0.2),

      geo_spread_24h: geoLast,
      geo_spread_trend: trendFromDelta(geoLast - geoPrev, 0),

      window_events_24h: last24h.length,
      window_events_prev: prev24h.length,
    }
  })()

  // Fetch today's briefing
  const { data: briefing, isLoading: briefingLoading } = useQuery({
    queryKey: ['briefing', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('briefings')
        .select('*')
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })

  // Fetch 24h SITREP
  const {
    data: sitrep24h,
    isLoading: sitrepLoading,
    refetch: refetchSitrep,
    isFetching: sitrepFetching,
    error: sitrepError,
  } = useQuery({
    queryKey: ['overview', 'sitrep', '24h', sitrepLanguage],
    queryFn: async () => {
      const res = await fetch(`/api/overview/sitrep-24h?language=${sitrepLanguage}`, { method: 'GET' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to fetch SITREP')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-intel-text">
            Intelligence overview
          </h1>
          <p className="text-xs sm:text-sm text-intel-muted mt-1">
            Last updated: {formatRelativeTime(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => ingestMutation.mutate()}
            disabled={ingestMutation.isPending}
            className="text-xs sm:text-sm"
          >
            {ingestMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Obteniendo...</span>
                <span className="sm:hidden">Obteniendo</span>
              </>
            ) : (
              <>
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Obtener artículos</span>
                <span className="sm:hidden">Obtener</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateBriefingMutation.mutate()}
            disabled={generateBriefingMutation.isPending}
            className="text-xs sm:text-sm"
          >
            {generateBriefingMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Generando...</span>
                <span className="sm:hidden">Generando</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Regenerar briefing</span>
                <span className="sm:hidden">Regenerar</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
            <Link href="/briefing">
              <span className="hidden sm:inline">View today&apos;s briefing</span>
              <span className="sm:hidden">Briefing</span>
              <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await fetch('/api/osint/analyze-mentions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ time_range: 24 }),
                })
                const data = await response.json()
                if (response.ok) {
                  toast({
                    title: 'Análisis OSINT completado',
                    description: `${data.processed || 0} artículos analizados`,
                  })
                  queryClient.invalidateQueries({ queryKey: ['news-ticker'] })
                } else {
                  throw new Error(data.error || 'Error desconocido')
                }
              } catch (error) {
                toast({
                  title: 'Error en análisis OSINT',
                  description: error instanceof Error ? error.message : 'Error desconocido',
                  variant: 'destructive',
                })
              }
            }}
            className="text-xs sm:text-sm"
          >
            <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Analizar menciones OSINT</span>
            <span className="sm:hidden">OSINT</span>
          </Button>
        </div>
      </div>

      {/* Alert banner if high severity event */}
      {clusters && clusters.some((c: any) => c.severity >= 80) && (
        <Card className="border-classified-red bg-red-950/20">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-6 w-6 text-classified-red animate-pulse" />
            <div className="flex-1">
              <p className="font-medium text-classified-red">High-priority event detected</p>
              <p className="text-sm text-intel-text/70">
                {clusters.filter((c: any) => c.severity >= 80).length} event(s) require immediate
                attention
              </p>
            </div>
            <Button variant="destructive" size="sm" asChild>
              <Link href="/clusters?severity=high">Review now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Intelligence Row: SITREP + Perplexity News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 24h SITREP */}
        <Card className="intel-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <Globe className="h-4 w-4 text-intel-accent" />
                24h SITREP
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sitrepLanguage} onValueChange={setSitrepLanguage}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">ES</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                    <SelectItem value="fr">FR</SelectItem>
                    <SelectItem value="de">DE</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="pt">PT</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSitrep()}
                  disabled={sitrepFetching}
                >
                  {sitrepFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <InfoDropdown
                  title="24h SITREP"
                  content={
                    <>
                      <p className="mb-2">
                        Resumen operativo generado usando únicamente clusters del sistema de las últimas 24h.
                      </p>
                      <ul className="list-disc list-inside space-y-1 mb-2">
                        <li><strong>Fuente de datos:</strong> tabla <code>clusters</code> (top severidad/recencia).</li>
                        <li><strong>Salida:</strong> resumen ejecutivo + desarrollos clave + señales observables 24–48h.</li>
                        <li><strong>Permisos:</strong> solo <code>admin</code>/<code>analyst</code>.</li>
                      </ul>
                      <p className="text-xs text-intel-muted/70">
                        SITREP clasificado: conciso, operacional y basado únicamente en datos del sistema.
                      </p>
                    </>
                  }
                  side="left"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sitrepLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
              </div>
            ) : sitrepError ? (
              <div className="text-sm text-intel-muted">
                <p className="mb-2">No se pudo generar el SITREP.</p>
                <p className="text-xs">{sitrepError instanceof Error ? sitrepError.message : 'Error desconocido'}</p>
              </div>
            ) : sitrep24h?.sitrep ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Headline</p>
                  <p className="text-sm text-intel-text font-medium">{sitrep24h.sitrep.headline}</p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Executive summary</p>
                  <p className="text-xs text-intel-muted leading-relaxed">
                    {sitrep24h.sitrep.executive_summary}
                  </p>
                </div>
                {Array.isArray(sitrep24h.sitrep.key_developments) && sitrep24h.sitrep.key_developments.length > 0 && (
                  <div>
                    <p className="text-xs font-mono uppercase text-intel-muted mb-2">Key developments</p>
                    <ul className="text-xs text-intel-muted space-y-1 list-disc list-inside">
                      {sitrep24h.sitrep.key_developments.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(sitrep24h.sitrep.watchlist_24_48h) && sitrep24h.sitrep.watchlist_24_48h.length > 0 && (
                  <div>
                    <p className="text-xs font-mono uppercase text-intel-muted mb-2">Watchlist (24–48h)</p>
                    <ul className="text-xs text-intel-muted space-y-1 list-disc list-inside">
                      {sitrep24h.sitrep.watchlist_24_48h.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {sitrep24h?.sitrep && (
                  <div className="pt-2 border-t border-intel-border text-xs text-intel-muted">
                    <span className="font-mono">Generated {formatRelativeTime(sitrep24h.generated_at)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-intel-muted">SITREP no disponible.</div>
            )}
          </CardContent>
        </Card>

        {/* Perplexity News Widget */}
        <PerplexityNewsWidget />
      </div>

      {/* Events and Awareness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational posture panel */}
        <Card className="intel-card lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <Shield className="h-4 w-4 text-intel-accent" />
                Situational Awareness
              </CardTitle>
              <InfoDropdown
                title="Situational Awareness"
                content={
                  <>
                    <p className="mb-2">
                      Panel de supervisión “tipo gubernamental” basado en datos reales del sistema (tabla <code>clusters</code>).
                    </p>
                    <p className="mb-2">
                      <strong>Cómo se calcula:</strong> se usa una ventana móvil de 48h; se comparan métricas de las últimas 24h vs las 24h anteriores (tendencia ↑/↓).
                    </p>
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      <li><strong>Ops tempo (1h):</strong> clusters actualizados en la última hora.</li>
                      <li><strong>High priority (24h):</strong> clusters con <code>severity ≥ 80</code> en 24h.</li>
                      <li><strong>Confidence avg (24h):</strong> media de <code>confidence</code> en 24h.</li>
                      <li><strong>Source density (24h):</strong> media de <code>article_count</code> por cluster en 24h.</li>
                      <li><strong>Geographic spread (24h):</strong> países únicos agregados desde <code>countries</code> en 24h.</li>
                    </ul>
                    <p className="text-xs text-intel-muted/70">
                      Objetivo: mostrar “postura operacional” entendible y audit-able, no un número inventado.
                    </p>
                  </>
                }
                side="left"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Priority Countries */}
            {(() => {
              const priorityCountries = new Map<string, { count: number; maxSeverity: number }>()
              clusters48h?.forEach((c: any) => {
                if (c.severity >= 70) {
                  c.countries?.forEach((country: string) => {
                    const existing = priorityCountries.get(country) || { count: 0, maxSeverity: 0 }
                    priorityCountries.set(country, {
                      count: existing.count + 1,
                      maxSeverity: Math.max(existing.maxSeverity, c.severity),
                    })
                  })
                }
              })
              const sorted = Array.from(priorityCountries.entries())
                .sort((a, b) => b[1].maxSeverity - a[1].maxSeverity)
                .slice(0, 5)
              
              return sorted.length > 0 ? (
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Priority Countries</p>
                  <div className="space-y-1.5">
                    {sorted.map(([country, data]) => (
                      <div key={country} className="flex items-center justify-between p-2 rounded bg-intel-border/30">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{country}</Badge>
                          {data.maxSeverity >= 80 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px]">CRITICAL</Badge>
                          )}
                        </div>
                        <span className="text-xs text-intel-muted">{data.count} event{data.count !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-intel-muted py-2">No priority countries identified</div>
              )
            })()}

            {/* Critical Events */}
            {(() => {
              const critical = clusters48h?.filter((c: any) => c.severity >= 80).slice(0, 3) || []
              return critical.length > 0 ? (
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Critical Events</p>
                  <div className="space-y-1.5">
                    {critical.map((c: any) => (
                      <Link key={c.id} href={`/clusters/${c.id}`}>
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors cursor-pointer">
                          <p className="text-xs text-intel-text line-clamp-1 font-medium mb-1">{c.canonical_title || 'Untitled Event'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-intel-muted">
                            <span>Severity: {c.severity}</span>
                            <span>•</span>
                            <span>{c.countries?.slice(0, 2).join(', ') || 'N/A'}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* Emerging Threats */}
            {(() => {
              const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
              const emerging = clusters48h?.filter((c: any) => {
                const created = new Date(c.created_at || c.updated_at).getTime()
                return created >= sixHoursAgo && c.severity >= 70
              }).slice(0, 3) || []
              
              return emerging.length > 0 ? (
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Emerging Threats</p>
                  <div className="space-y-1.5">
                    {emerging.map((c: any) => (
                      <Link key={c.id} href={`/clusters/${c.id}`}>
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors cursor-pointer">
                          <p className="text-xs text-intel-text line-clamp-1 font-medium mb-1">{c.canonical_title || 'Untitled Event'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-intel-muted">
                            <span>New • {formatRelativeTime(c.created_at || c.updated_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* Intelligence Gaps */}
            {(() => {
              const gaps = clusters48h?.filter((c: any) => c.confidence < 60 && c.severity >= 50)
                .slice(0, 3) || []
              
              return gaps.length > 0 ? (
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Intelligence Gaps</p>
                  <div className="space-y-1.5">
                    {gaps.map((c: any) => (
                      <Link key={c.id} href={`/clusters/${c.id}`}>
                        <div className="p-2 rounded bg-intel-border/30 hover:bg-intel-border/50 transition-colors cursor-pointer">
                          <p className="text-xs text-intel-text line-clamp-1 mb-1">{c.canonical_title || 'Untitled Event'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-intel-muted">
                            <span>Confidence: {c.confidence}%</span>
                            <span>•</span>
                            <span>Need more sources</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* Regional Tensions */}
            {(() => {
              const tensions = clusters48h?.filter((c: any) => c.countries?.length > 1 && c.severity >= 60)
                .slice(0, 3) || []
              
              return tensions.length > 0 ? (
                <div>
                  <p className="text-xs font-mono uppercase text-intel-muted mb-2">Regional Tensions</p>
                  <div className="space-y-1.5">
                    {tensions.map((c: any) => (
                      <Link key={c.id} href={`/clusters/${c.id}`}>
                        <div className="p-2 rounded bg-intel-border/30 hover:bg-intel-border/50 transition-colors cursor-pointer">
                          <p className="text-xs text-intel-text line-clamp-1 mb-1">{c.canonical_title || 'Untitled Event'}</p>
                          <div className="flex items-center gap-1 flex-wrap text-[10px] text-intel-muted">
                            {c.countries?.slice(0, 4).map((country: string) => (
                              <Badge key={country} variant="outline" className="text-[9px] px-1 py-0">{country}</Badge>
                            ))}
                            {c.countries?.length > 4 && <span className="text-intel-muted">+{c.countries.length - 4}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            <div className="pt-2 border-t border-intel-border">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/clusters">
                  View all events
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Clusters */}
        <Card className="intel-card lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <Globe className="h-4 w-4 text-intel-accent" />
                Recent events
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clusters">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {clustersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : clusters && clusters.length > 0 ? (
              <div className="space-y-3">
                {clusters.map((cluster: any) => (
                  <ClusterCard key={cluster.id} cluster={cluster} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-intel-muted">
                <Globe className="h-8 w-8 mb-2 opacity-50" />
                <p>No recent events</p>
                <p className="text-xs">Events will appear as they are ingested</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Briefing Preview */}
      <Card className="intel-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Clock className="h-4 w-4 text-intel-accent" />
              Today&apos;s briefing
            </CardTitle>
            <div className="flex items-center gap-2">
              {briefing && (
                <Badge variant="outline" className="text-xs">
                  {(briefing.items as unknown[])?.length || 0} items
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/briefing">Full briefing</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {briefingLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : briefing && (briefing.items as unknown[])?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {((briefing.items as Array<{
                title: string
                fact: string
                confidence: number
              }>)).slice(0, 3).map((item, index) => (
                <Card key={index} className="bg-intel-border/30 border-intel-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="fact" className="text-[10px]">
                        FACT
                      </Badge>
                      <span className="text-xs text-intel-muted">
                        {item.confidence}% conf
                      </span>
                    </div>
                    <h4 className="font-medium text-sm text-intel-text mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-intel-muted line-clamp-3">
                      {item.fact}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-intel-muted">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p>No briefing generated yet</p>
              <p className="text-xs">The briefing is generated daily at 06:00 UTC</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

