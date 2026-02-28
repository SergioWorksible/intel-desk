'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoDropdown } from '@/components/ui/info-dropdown'
import Link from 'next/link'
import { Globe, AlertTriangle, TrendingUp, ExternalLink, Zap, Link2, ArrowRight, Brain } from 'lucide-react'
import { getSeverityColor } from '@/lib/utils'

export function GeopoliticalTopics() {
  const { data, isLoading } = useQuery({
    queryKey: ['geopolitical-topics'],
    queryFn: async () => {
      const response = await fetch('/api/markets/geopolitical-topics')
      if (!response.ok) throw new Error('Failed to fetch topics')
      return response.json()
    },
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <Card className="intel-card">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Link2 className="h-4 w-4 text-intel-accent" />
            Temas geopolíticos vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const topics = data?.topics || []

  if (topics.length === 0) {
    return (
      <Card className="intel-card">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Link2 className="h-4 w-4 text-intel-accent" />
            Temas geopolíticos vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-intel-muted">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-2">No hay temas geopolíticos vinculados</p>
            <p className="text-xs max-w-md mx-auto">
              Cuando se crean nuevos eventos geopolíticos, el sistema usa IA para identificar automáticamente qué símbolos de mercado son relevantes y crear vínculos.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="intel-card mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Link2 className="h-4 w-4 text-intel-accent" />
            Temas geopolíticos vinculados
          </CardTitle>
          <InfoDropdown
            title="Cómo funcionan las vinculaciones"
            content={
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Proceso automático:</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-intel-accent mt-0.5">1.</span>
                      <span>Se crea un evento geopolítico (cluster) con temas como "energy", "defense", etc.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-intel-accent mt-0.5">2.</span>
                      <span>La IA analiza el evento y busca símbolos de mercado relevantes basándose en sector, país, y tipo.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-intel-accent mt-0.5">3.</span>
                      <span>Se crean vínculos automáticos entre el evento y los símbolos afectados.</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-intel-border">
                  <p className="text-xs text-intel-muted">
                    <strong>Ejemplo:</strong> Un evento sobre "sanciones energéticas" se vincula automáticamente a símbolos de energía como XOM, CVX, etc.
                  </p>
                </div>
              </div>
            }
            side="left"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[450px]">
          <div className="space-y-4 pr-4">
            {topics.map((topic: any, index: number) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-intel-border/20 border border-intel-border/50 hover:border-intel-accent/40 transition-all group"
              >
                {/* Header con tema y severidad */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                      <h4 className="font-semibold text-intel-text capitalize">
                        {topic.topic}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getSeverityColor(topic.severity)}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Severidad {topic.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {topic.symbols.length} símbolo{topic.symbols.length !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {topic.clusters.length} evento{topic.clusters.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Visualización de la vinculación */}
                <div className="mt-4 space-y-4">
                  {/* Símbolos afectados */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-medium text-intel-text uppercase tracking-wide">
                        Símbolos afectados
                      </p>
                      <ArrowRight className="h-3 w-3 text-intel-muted" />
                    </div>
                    <div className="space-y-3">
                      {topic.symbols.slice(0, 5).map((symbol: any) => (
                        <div
                          key={symbol.id}
                          className="p-3 rounded-lg bg-intel-border/10 border border-intel-border/30 hover:border-intel-accent/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/markets/symbol/${symbol.id}`}
                                className="flex items-center gap-2 group"
                              >
                                <span className="text-sm font-semibold text-intel-text group-hover:text-intel-accent transition-colors">
                                  {symbol.name}
                                </span>
                                <span className="text-xs font-mono text-intel-muted">
                                  ({symbol.symbol})
                                </span>
                                <ExternalLink className="h-3 w-3 text-intel-muted group-hover:text-intel-accent transition-colors shrink-0" />
                              </Link>
                              {symbol.sector && (
                                <p className="text-xs text-intel-muted mt-1">
                                  {symbol.sector}
                                  {symbol.country && ` • ${symbol.country}`}
                                </p>
                              )}
                            </div>
                            {symbol.impact_assessment && (
                              <Badge
                                variant="outline"
                                className={`text-xs shrink-0 font-medium ${
                                  symbol.impact_assessment.toLowerCase().includes('alto') ||
                                  symbol.impact_assessment.toLowerCase().includes('high')
                                    ? 'border-red-500/50 text-red-400 bg-red-950/20'
                                    : symbol.impact_assessment.toLowerCase().includes('medio') ||
                                      symbol.impact_assessment.toLowerCase().includes('medium')
                                    ? 'border-orange-500/50 text-orange-400 bg-orange-950/20'
                                    : 'border-yellow-500/50 text-yellow-400 bg-yellow-950/20'
                                }`}
                              >
                                Impacto: {symbol.impact_assessment}
                              </Badge>
                            )}
                          </div>
                          {symbol.rationale && (
                            <div className="mt-3 pt-2 border-t border-intel-border/30">
                              <p className="text-xs font-medium text-intel-muted mb-1 uppercase tracking-wide">
                                Cómo afecta:
                              </p>
                              <p className="text-xs text-intel-text/90 leading-relaxed">
                                {symbol.rationale}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      {topic.symbols.length > 5 && (
                        <div className="text-center py-2">
                          <span className="text-xs text-intel-muted">
                            +{topic.symbols.length - 5} símbolo{topic.symbols.length - 5 !== 1 ? 's' : ''} más
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Eventos relacionados */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-medium text-intel-text uppercase tracking-wide">
                        Eventos geopolíticos relacionados
                      </p>
                      <ArrowRight className="h-3 w-3 text-intel-muted" />
                    </div>
                    <div className="space-y-2">
                      {topic.clusters.slice(0, 3).map((cluster: any) => (
                        <Link
                          key={cluster.id}
                          href={`/clusters/${cluster.id}`}
                          className="block p-2.5 rounded bg-intel-border/20 hover:bg-intel-border/40 transition-colors border border-intel-border/30 group/link"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-intel-text line-clamp-2 group-hover/link:text-intel-accent transition-colors">
                                {cluster.title}
                              </p>
                              {cluster.countries && cluster.countries.length > 0 && (
                                <p className="text-[10px] text-intel-muted mt-1.5">
                                  {cluster.countries.join(', ')}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-intel-muted shrink-0 mt-0.5 group-hover/link:text-intel-accent transition-colors" />
                          </div>
                        </Link>
                      ))}
                      {topic.clusters.length > 3 && (
                        <p className="text-xs text-intel-muted text-center py-1">
                          +{topic.clusters.length - 3} evento{topic.clusters.length - 3 !== 1 ? 's' : ''} más
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

