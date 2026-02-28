'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { 
  X, Globe, Users, AlertTriangle, TrendingUp, Newspaper, 
  Shield, Swords, RefreshCw, Clock, ExternalLink, MapPin,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatRelativeTime, getSeverityColor } from '@/lib/utils'
import type { Database } from '@/types/database'

type Cluster = Database['public']['Tables']['clusters']['Row']
type Article = Database['public']['Tables']['articles']['Row']
type Country = Database['public']['Tables']['countries']['Row']

interface CountryIntelData {
  summary: string
  recentNews: Array<{ title: string; source: string; date: string }>
  keyFigures: Array<{ name: string; role: string }>
  economicIndicators: { gdp: string; inflation: string; unemployment: string }
  geopoliticalContext: string
  riskFactors: string[]
  alliances: string[]
  conflicts: string[]
}

interface CountrySidebarProps {
  selectedCountry: string | null
  selectedCountryData: Country | null
  clusters: Cluster[]
  articles: Article[]
  marketSymbolsCount: number
  onClose: () => void
  clustersLoading: boolean
  clustersError: Error | null
}

// Country names fallback
const countryNames: Record<string, string> = {
  'US': 'Estados Unidos', 'CN': 'China', 'RU': 'Rusia', 'GB': 'Reino Unido', 'DE': 'Alemania',
  'FR': 'Francia', 'JP': 'Japón', 'IN': 'India', 'BR': 'Brasil', 'AU': 'Australia',
  'CA': 'Canadá', 'KR': 'Corea del Sur', 'SA': 'Arabia Saudita', 'IR': 'Irán', 'IL': 'Israel',
  'TR': 'Turquía', 'UA': 'Ucrania', 'PL': 'Polonia', 'TW': 'Taiwán', 'MX': 'México',
  'ID': 'Indonesia', 'EG': 'Egipto', 'ZA': 'Sudáfrica', 'NG': 'Nigeria', 'PK': 'Pakistán',
  'KP': 'Corea del Norte', 'VE': 'Venezuela', 'AF': 'Afganistán', 'SY': 'Siria', 'YE': 'Yemen',
  'ES': 'España', 'IT': 'Italia', 'NL': 'Países Bajos', 'BE': 'Bélgica', 'CH': 'Suiza',
  'AT': 'Austria', 'SE': 'Suecia', 'NO': 'Noruega', 'DK': 'Dinamarca', 'FI': 'Finlandia',
  'GR': 'Grecia', 'PT': 'Portugal', 'IE': 'Irlanda', 'CZ': 'Chequia', 'HU': 'Hungría',
  'SS': 'Sudán del Sur', 'ER': 'Eritrea', 'SO': 'Somalia', 'XK': 'Kosovo', 'PS': 'Palestina',
}

export default function CountrySidebar({
  selectedCountry,
  selectedCountryData,
  clusters,
  articles,
  marketSymbolsCount,
  onClose,
  clustersLoading,
  clustersError,
}: CountrySidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    news: true,
    context: false,
    risks: false,
    figures: false,
  })

  // Fetch intel data when country is selected
  const { data: intelData, isLoading: intelLoading, refetch: refetchIntel } = useQuery({
    queryKey: ['country-intel', selectedCountry],
    queryFn: async () => {
      if (!selectedCountry) return null
      const response = await fetch(`/api/country/intel?code=${selectedCountry}`)
      if (!response.ok) throw new Error('Error obteniendo intel')
      return response.json()
    },
    enabled: !!selectedCountry,
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const intel: CountryIntelData | null = intelData?.intel || null
  const cached = intelData?.cached || false
  const cachedAt = intelData?.cachedAt || intelData?.fetchedAt

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getRiskColor = (index: number | undefined) => {
    if (!index) return 'text-gray-400'
    if (index < 30) return 'text-green-400'
    if (index < 50) return 'text-yellow-400'
    if (index < 70) return 'text-orange-400'
    return 'text-red-400'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Hace menos de 1h'
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${Math.floor(hours / 24)}d`
  }

  // Filter clusters for selected country
  const countryFilteredClusters = clusters.filter(
    (c) => !selectedCountry || c.countries.includes(selectedCountry)
  )

  const countryArticlesCount = articles.filter(
    (a) => selectedCountry && a.countries.includes(selectedCountry)
  ).length

  // Get country info from API response or fallback
  const countryFromApi = intelData?.country
  const effectiveCountryData = selectedCountryData || countryFromApi
  const countryName = effectiveCountryData?.name || countryNames[selectedCountry || ''] || selectedCountry
  const countryRegion = effectiveCountryData?.region || 'Información no disponible'

  // If no country selected, show default view
  if (!selectedCountry) {
    return (
      <div className="w-96 flex flex-col gap-4">
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-8 text-intel-muted">
            <MapPin className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Haz clic en un país para ver detalles</p>
          </CardContent>
        </Card>

        {/* Recent events */}
        <Card className="intel-card flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-intel-accent" />
              Eventos recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {clustersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : clusters.length > 0 ? (
                <div className="space-y-3">
                  {clusters.slice(0, 15).map((cluster) => (
                    <Link key={cluster.id} href={`/clusters/${cluster.id}`}>
                      <div className="p-3 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-intel-text line-clamp-2">
                            {cluster.canonical_title}
                          </h4>
                          <Badge className={getSeverityColor(cluster.severity)}>
                            {cluster.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-intel-muted">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(cluster.updated_at)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-intel-muted">
                  <Globe className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron eventos</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-96 flex flex-col gap-4 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-2">
          {/* Country Header Card */}
          <Card className="intel-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {selectedCountry}
                  </div>
                  <div>
                    <CardTitle className="text-base font-mono">{countryName}</CardTitle>
                    <p className="text-xs text-intel-muted">{countryRegion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => refetchIntel()}
                    className="h-8 w-8"
                    disabled={intelLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", intelLoading && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {cachedAt && (
                <div className="flex items-center gap-1 text-[10px] text-intel-muted mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{cached ? 'Cache' : 'Actualizado'}: {formatDate(cachedAt)}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Risk Indicators - only show if we have data */}
              {effectiveCountryData?.stability_index !== undefined && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-intel-border/30 rounded text-center">
                    <div className="text-[10px] text-intel-muted">Estabilidad</div>
                    <div className={cn("text-lg font-bold", getRiskColor(100 - (effectiveCountryData.stability_index || 0)))}>
                      {effectiveCountryData.stability_index ? (100 - effectiveCountryData.stability_index) : '--'}%
                    </div>
                  </div>
                  <div className="p-2 bg-intel-border/30 rounded text-center">
                    <div className="text-[10px] text-intel-muted">Economía</div>
                    <div className={cn("text-lg font-bold", getRiskColor(100 - (effectiveCountryData.economic_index || 0)))}>
                      {effectiveCountryData.economic_index ? (100 - effectiveCountryData.economic_index) : '--'}%
                    </div>
                  </div>
                  <div className="p-2 bg-intel-border/30 rounded text-center">
                    <div className="text-[10px] text-intel-muted">Político</div>
                    <div className={cn("text-lg font-bold", getRiskColor(100 - (effectiveCountryData.political_index || 0)))}>
                      {effectiveCountryData.political_index ? (100 - effectiveCountryData.political_index) : '--'}%
                    </div>
                  </div>
                </div>
              )}

              {/* Watchlist Badge */}
              {effectiveCountryData?.watchlist && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>País en lista de vigilancia</span>
                </div>
              )}

              {/* Basic Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-intel-border">
                <div className="text-center">
                  <p className="text-[10px] text-intel-muted">Eventos</p>
                  <p className="text-sm font-mono text-intel-text">{countryFilteredClusters.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-intel-muted">Artículos</p>
                  <p className="text-sm font-mono text-intel-text">{countryArticlesCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-intel-muted">Mercados</p>
                  <p className="text-sm font-mono text-intel-text">{marketSymbolsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intel Summary */}
          {intelLoading ? (
            <Card className="intel-card">
              <CardContent className="py-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ) : intel?.summary ? (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Globe className="h-4 w-4 text-intel-accent" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-intel-text leading-relaxed">{intel.summary}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent News from Intel */}
          {intel?.recentNews && intel.recentNews.length > 0 && (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <button 
                  onClick={() => toggleSection('news')}
                  className="w-full flex items-center justify-between"
                >
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-intel-accent" />
                    Noticias últimas 24h
                    <Badge variant="outline" className="ml-2 text-[10px]">{intel.recentNews.length}</Badge>
                  </CardTitle>
                  {expandedSections.news ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              {expandedSections.news && (
                <CardContent className="space-y-2">
                  {intel.recentNews.slice(0, 5).map((news, i) => (
                    <div key={i} className="p-2 bg-intel-border/30 rounded hover:bg-intel-border/50 transition-colors">
                      <p className="text-xs text-intel-text font-medium line-clamp-2">{news.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-intel-muted mt-1">
                        <span>{news.source}</span>
                        <span>•</span>
                        <span>{news.date}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Conflicts */}
          {intel?.conflicts && intel.conflicts.length > 0 && (
            <Card className="intel-card border-red-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2 text-red-400">
                  <Swords className="h-4 w-4" />
                  Conflictos activos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {intel.conflicts.map((conflict, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-300">{conflict}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Alliances */}
          {intel?.alliances && intel.alliances.length > 0 && (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Shield className="h-4 w-4 text-intel-accent" />
                  Alianzas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {intel.alliances.map((alliance, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
                      {alliance}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Factors */}
          {intel?.riskFactors && intel.riskFactors.length > 0 && (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <button 
                  onClick={() => toggleSection('risks')}
                  className="w-full flex items-center justify-between"
                >
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    Factores de riesgo
                  </CardTitle>
                  {expandedSections.risks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              {expandedSections.risks && (
                <CardContent>
                  <ul className="space-y-1">
                    {intel.riskFactors.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-intel-muted">
                        <span className="text-orange-400">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}

          {/* Economic Indicators */}
          {intel?.economicIndicators && (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-intel-accent" />
                  Indicadores económicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-intel-border/30 rounded text-center">
                    <div className="text-[10px] text-intel-muted">PIB</div>
                    <div className="text-xs font-semibold text-intel-text">{intel.economicIndicators.gdp}</div>
                  </div>
                  <div className="p-2 bg-intel-border/30 rounded text-center">
                    <div className="text-[10px] text-intel-muted">Inflación</div>
                    <div className="text-xs font-semibold text-intel-text">{intel.economicIndicators.inflation}</div>
                  </div>
                  <div className="p-2 bg-intel-border/30 rounded text-center">
                    <div className="text-[10px] text-intel-muted">Desempleo</div>
                    <div className="text-xs font-semibold text-intel-text">{intel.economicIndicators.unemployment}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Figures */}
          {intel?.keyFigures && intel.keyFigures.length > 0 && (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <button 
                  onClick={() => toggleSection('figures')}
                  className="w-full flex items-center justify-between"
                >
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Users className="h-4 w-4 text-intel-accent" />
                    Figuras clave
                  </CardTitle>
                  {expandedSections.figures ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              {expandedSections.figures && (
                <CardContent className="space-y-2">
                  {intel.keyFigures.map((figure, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-[10px] font-bold text-white">
                        {figure.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs text-intel-text font-medium">{figure.name}</p>
                        <p className="text-[10px] text-intel-muted">{figure.role}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Geopolitical Context */}
          {intel?.geopoliticalContext && (
            <Card className="intel-card">
              <CardHeader className="pb-2">
                <button 
                  onClick={() => toggleSection('context')}
                  className="w-full flex items-center justify-between"
                >
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Globe className="h-4 w-4 text-intel-accent" />
                    Contexto geopolítico
                  </CardTitle>
                  {expandedSections.context ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              {expandedSections.context && (
                <CardContent>
                  <p className="text-xs text-intel-text leading-relaxed">{intel.geopoliticalContext}</p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Country Events */}
          <Card className="intel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-intel-accent" />
                Eventos en {countryName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {countryFilteredClusters.length > 0 ? (
                <div className="space-y-2">
                  {countryFilteredClusters.slice(0, 8).map((cluster) => (
                    <Link key={cluster.id} href={`/clusters/${cluster.id}`}>
                      <div className="p-2 rounded bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-medium text-intel-text line-clamp-2">
                            {cluster.canonical_title}
                          </h4>
                          <Badge className={cn(getSeverityColor(cluster.severity), "text-[10px] px-1.5")}>
                            {cluster.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-intel-muted mt-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(cluster.updated_at)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-intel-muted text-center py-4">No hay eventos recientes</p>
              )}
            </CardContent>
          </Card>

          {/* View Full Profile Button */}
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/countries/${selectedCountry}`}>
              Ver perfil completo
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}

