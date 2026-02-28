    'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  ChevronDown,
  Clock,
  Activity,
  Languages,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Shield,
  BarChart3,
} from 'lucide-react'
import { InfoDropdown } from '@/components/ui/info-dropdown'
import type { MarketIntelligenceReport } from '@/lib/ai/market-intelligence'
import { formatRelativeTime } from '@/lib/utils'

export function MarketIntelligencePanel() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']))
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const queryClient = useQueryClient()

  const {
    data: intelligence,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<MarketIntelligenceReport>({
    queryKey: ['market-intelligence', language],
    queryFn: async () => {
      const response = await fetch('/api/markets/intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language }),
      })
      if (!response.ok) {
        throw new Error('Failed to generate intelligence')
      }
      return response.json()
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - cache por 24 horas
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const handleManualRefresh = async () => {
    // Invalidar el cache para forzar regeneración
    await queryClient.invalidateQueries({ queryKey: ['market-intelligence'] })
    // Refetch inmediatamente
    await refetch()
  }

  const handleLanguageChange = (newLanguage: 'es' | 'en') => {
    setLanguage(newLanguage)
    // Invalidar cache cuando cambia el idioma
    queryClient.invalidateQueries({ queryKey: ['market-intelligence'] })
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-500'
      case 'negative':
        return 'text-red-500'
      default:
        return 'text-intel-muted'
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />
      case 'negative':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-orange-500'
      default:
        return 'bg-yellow-500'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-orange-500'
      default:
        return 'text-green-500'
    }
  }

  return (
    <Card className="intel-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Brain className="h-4 w-4 text-intel-accent" />
            Market Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {intelligence && (
              <span className="text-xs text-intel-muted">
                {formatRelativeTime(intelligence.generated_at)}
              </span>
            )}
            <Select value={language} onValueChange={(value) => handleLanguageChange(value as 'es' | 'en')}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <div className="flex items-center gap-1">
                  <Languages className="h-3 w-3" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isFetching}
              title="Regenerar reporte manualmente"
            >
              {isFetching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <InfoDropdown
              title="Market Intelligence"
              content={
                <>
                  <p className="mb-2">
                    Sistema de inteligencia que analiza eventos geopolíticos y genera suposiciones
                    y planes de acción para mercados.
                  </p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li>
                      <strong>Escenarios:</strong> posibles desarrollos y su impacto en símbolos
                    </li>
                    <li>
                      <strong>Hipótesis:</strong> suposiciones basadas en análisis geopolítico
                    </li>
                    <li>
                      <strong>Planes:</strong> estrategias de trading con condiciones de
                      entrada/salida
                    </li>
                    <li>
                      <strong>Alertas:</strong> riesgos identificados y acciones recomendadas
                    </li>
                  </ul>
                  <p className="text-xs text-intel-muted/70">
                    Generado por IA en base a clusters de últimos 7 días, briefing diario y símbolos vinculados.
                  </p>
                </>
              }
              side="left"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-intel-muted">
            <p className="mb-2">Error al generar inteligencia de mercado.</p>
            <p className="text-xs">{error instanceof Error ? error.message : 'Error desconocido'}</p>
          </div>
        ) : intelligence ? (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {/* Summary */}
              <Collapsible
                open={expandedSections.has('summary')}
                onOpenChange={() => toggleSection('summary')}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-intel-accent" />
                      <span className="text-sm font-medium text-intel-text">Resumen ejecutivo</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.has('summary') ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 text-sm text-intel-text leading-relaxed">
                    {intelligence.summary}
                  </div>
                  {intelligence.key_trends.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-mono uppercase text-intel-muted px-3">
                        Tendencias clave:
                      </p>
                      {intelligence.key_trends.map((trend, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 text-sm text-intel-muted flex items-start gap-2"
                        >
                          <span className="text-intel-accent mt-1">•</span>
                          <span>{trend}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Scenarios */}
              {intelligence.scenarios.length > 0 && (
                <Collapsible
                  open={expandedSections.has('scenarios')}
                  onOpenChange={() => toggleSection('scenarios')}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-intel-accent" />
                        <span className="text-sm font-medium text-intel-text">
                          Escenarios ({intelligence.scenarios.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedSections.has('scenarios') ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      {intelligence.scenarios.map((scenario, i) => (
                        <div key={i} className="p-3 rounded-lg bg-intel-border/20 border border-intel-border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={getImpactColor(scenario.impact)}>
                                {getImpactIcon(scenario.impact)}
                              </span>
                              <h4 className="text-sm font-medium text-intel-text">
                                {scenario.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {scenario.probability}% prob
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {scenario.timeframe}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-intel-muted mb-2">{scenario.description}</p>
                          <p className="text-xs text-intel-muted/70 italic mb-2">
                            {scenario.rationale}
                          </p>
                          {scenario.affected_symbols.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {scenario.affected_symbols.map((symbol, j) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  {symbol}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Hypotheses */}
              {intelligence.hypotheses.length > 0 && (
                <Collapsible
                  open={expandedSections.has('hypotheses')}
                  onOpenChange={() => toggleSection('hypotheses')}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-intel-accent" />
                        <span className="text-sm font-medium text-intel-text">
                          Hipótesis ({intelligence.hypotheses.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedSections.has('hypotheses') ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      {intelligence.hypotheses.map((hypothesis, i) => (
                        <div key={i} className="p-3 rounded-lg bg-intel-border/20 border border-intel-border">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-intel-text flex-1">
                              {hypothesis.statement}
                            </h4>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge variant="outline" className="text-xs">
                                {hypothesis.confidence}%
                              </Badge>
                              <Badge className={getRiskColor(hypothesis.risk_level)}>
                                {hypothesis.risk_level}
                              </Badge>
                            </div>
                          </div>
                          {hypothesis.supporting_events.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-mono uppercase text-intel-muted mb-1">
                                Eventos de apoyo:
                              </p>
                              {hypothesis.supporting_events.map((event, j) => (
                                <div key={j} className="text-xs text-green-500 ml-2">
                                  ✓ {event}
                                </div>
                              ))}
                            </div>
                          )}
                          {hypothesis.contrary_signals.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-mono uppercase text-intel-muted mb-1">
                                Señales contrarias:
                              </p>
                              {hypothesis.contrary_signals.map((signal, j) => (
                                <div key={j} className="text-xs text-red-500 ml-2">
                                  ✗ {signal}
                                </div>
                              ))}
                            </div>
                          )}
                          {hypothesis.actionable_insights.length > 0 && (
                            <div>
                              <p className="text-xs font-mono uppercase text-intel-muted mb-1">
                                Insights accionables:
                              </p>
                              {hypothesis.actionable_insights.map((insight, j) => (
                                <div key={j} className="text-xs text-intel-text ml-2">
                                  → {insight}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Trading Plans */}
              {intelligence.trading_plans.length > 0 && (
                <Collapsible
                  open={expandedSections.has('plans')}
                  onOpenChange={() => toggleSection('plans')}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-intel-accent" />
                        <span className="text-sm font-medium text-intel-text">
                          Oportunidades de inversión ({intelligence.trading_plans.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedSections.has('plans') ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-3">
                      {intelligence.trading_plans.map((plan, i) => {
                        const isLong = plan.strategy === 'long'
                        const isShort = plan.strategy === 'short'
                        const strategyColor = isLong
                          ? 'border-green-500/50 bg-green-950/20'
                          : isShort
                          ? 'border-red-500/50 bg-red-950/20'
                          : 'border-intel-border bg-intel-border/20'
                        
                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-lg border-2 ${strategyColor} transition-all hover:shadow-lg`}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-intel-text mb-2 flex items-center gap-2">
                                  {isLong ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                                  ) : isShort ? (
                                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <BarChart3 className="h-4 w-4 text-intel-accent" />
                                  )}
                                  {plan.title || `${plan.strategy.toUpperCase()} en ${plan.symbols.join(', ')}`}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge
                                    className={
                                      isLong
                                        ? 'bg-green-600 text-white'
                                        : isShort
                                        ? 'bg-red-600 text-white'
                                        : 'bg-intel-border'
                                    }
                                  >
                                    {plan.strategy.toUpperCase()}
                                  </Badge>
                                  {plan.symbols.map((symbol, j) => (
                                    <Badge
                                      key={j}
                                      variant="outline"
                                      className="text-xs font-mono bg-intel-bg/50"
                                    >
                                      {symbol}
                                    </Badge>
                                  ))}
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      plan.confidence >= 70
                                        ? 'border-green-500 text-green-500'
                                        : plan.confidence >= 50
                                        ? 'border-yellow-500 text-yellow-500'
                                        : 'border-red-500 text-red-500'
                                    }`}
                                  >
                                    {plan.confidence}% confianza
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Rationale */}
                            <div className="mb-3">
                              <p className="text-sm text-intel-text leading-relaxed">
                                {plan.rationale}
                              </p>
                            </div>

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              {plan.potential_upside && (
                                <div className="flex items-center gap-2 p-2 rounded bg-intel-border/20">
                                  <DollarSign className="h-3 w-3 text-green-500" />
                                  <div>
                                    <p className="text-xs text-intel-muted">Potencial</p>
                                    <p className="text-xs font-semibold text-green-500">
                                      {plan.potential_upside}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {plan.stop_loss && (
                                <div className="flex items-center gap-2 p-2 rounded bg-intel-border/20">
                                  <Shield className="h-3 w-3 text-red-500" />
                                  <div>
                                    <p className="text-xs text-intel-muted">Stop Loss</p>
                                    <p className="text-xs font-semibold text-red-500">
                                      {plan.stop_loss}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {plan.position_size && (
                                <div className="flex items-center gap-2 p-2 rounded bg-intel-border/20">
                                  <BarChart3 className="h-3 w-3 text-intel-accent" />
                                  <div>
                                    <p className="text-xs text-intel-muted">Tamaño</p>
                                    <p className="text-xs font-semibold text-intel-text">
                                      {plan.position_size}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Timeframe */}
                            <div className="mb-3 flex items-center gap-2 text-xs">
                              <Clock className="h-3 w-3 text-intel-muted" />
                              <span className="text-intel-muted">Timeframe:</span>
                              <span className="text-intel-text font-medium">{plan.timeframe}</span>
                            </div>

                            {/* Entry and Exit Conditions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div className="p-2 rounded bg-green-950/10 border border-green-500/20">
                                <p className="text-xs font-mono uppercase text-green-500 mb-2 flex items-center gap-1">
                                  <ArrowUpRight className="h-3 w-3" />
                                  Condiciones de entrada
                                </p>
                                <ul className="space-y-1">
                                  {plan.entry_conditions.map((cond, j) => (
                                    <li
                                      key={j}
                                      className="text-xs text-intel-text flex items-start gap-2"
                                    >
                                      <span className="text-green-500 mt-1">✓</span>
                                      <span>{cond}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-2 rounded bg-red-950/10 border border-red-500/20">
                                <p className="text-xs font-mono uppercase text-red-500 mb-2 flex items-center gap-1">
                                  <ArrowDownRight className="h-3 w-3" />
                                  Condiciones de salida
                                </p>
                                <ul className="space-y-1">
                                  {plan.exit_conditions.map((cond, j) => (
                                    <li
                                      key={j}
                                      className="text-xs text-intel-text flex items-start gap-2"
                                    >
                                      <span className="text-red-500 mt-1">✗</span>
                                      <span>{cond}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Risk Factors */}
                            {plan.risk_factors.length > 0 && (
                              <div className="mt-3 p-2 rounded bg-red-950/10 border border-red-500/20">
                                <p className="text-xs font-mono uppercase text-red-500 mb-2 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Factores de riesgo
                                </p>
                                <ul className="space-y-1">
                                  {plan.risk_factors.map((risk, j) => (
                                    <li
                                      key={j}
                                      className="text-xs text-intel-muted flex items-start gap-2"
                                    >
                                      <span className="text-red-500 mt-1">⚠</span>
                                      <span>{risk}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Risk Alerts */}
              {intelligence.risk_alerts.length > 0 && (
                <Collapsible
                  open={expandedSections.has('alerts')}
                  onOpenChange={() => toggleSection('alerts')}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-intel-text">
                          Alertas de riesgo ({intelligence.risk_alerts.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedSections.has('alerts') ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      {intelligence.risk_alerts.map((alert, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-red-950/20 border border-red-900/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {alert.symbol}
                              </Badge>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-intel-text mb-2">{alert.reason}</p>
                          <div className="text-xs text-intel-accent">
                            <strong>Acción recomendada:</strong> {alert.recommended_action}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  )
}

