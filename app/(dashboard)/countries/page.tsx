'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Flag,
  Search,
  Star,
  MapPin,
  Users,
  Building2,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  FileText,
  Activity,
  Clock,
  Globe,
  Shield,
  Target,
  Radio,
  Zap,
  Eye,
  ArrowUpDown,
} from 'lucide-react'
import { CountryFlag } from '@/components/country-flag'
import { getSeverityColor } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

type SortField = 'name' | 'severity' | 'clusters' | 'articles' | 'activity'
type SortDirection = 'asc' | 'desc'

export default function CountriesPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('severity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Fetch countries from Supabase
  const { data: countries, isLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('countries')
        .select('*')
        .order('name')

      if (error) throw error
      return data
    },
    refetchInterval: 30000,
  })

  // Fetch enriched country data from API Countries
  const { data: enrichedCountriesData } = useQuery({
    queryKey: ['enriched-countries'],
    queryFn: async () => {
      try {
        const response = await fetch('https://www.apicountries.com/countries')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        // Create a map by alpha2Code for quick lookup
        const map: Record<string, any> = {}
        data.forEach((country: any) => {
          map[country.alpha2Code] = country
        })
        return map
      } catch (error) {
        console.error('Error fetching enriched countries:', error)
        return {}
      }
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })

  // Fetch clusters para calcular riesgo
  const { data: clusters } = useQuery({
    queryKey: ['clusters-for-countries'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('id, countries, severity, updated_at, article_count')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data
    },
    refetchInterval: 30000, // Refetch cada 30 segundos
  })

  // Fetch articles para contar actividad reciente
  const { data: articles } = useQuery({
    queryKey: ['articles-for-countries'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('articles')
        .select('id, countries, published_at')
        .order('published_at', { ascending: false })
        .limit(1000)

      if (error) throw error
      return data
    },
    refetchInterval: 30000, // Refetch cada 30 segundos
  })

  // Calcular datos de riesgo por país
  const countryRiskData = useMemo(() => {
    if (!clusters || !articles) return {}
    
    const riskMap: Record<string, {
      maxSeverity: number
      clusterCount: number
      recentArticles: number
      lastActivity: Date | null
      riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none'
    }> = {}
    
    // Procesar clusters
    clusters.forEach((cluster: any) => {
      cluster.countries?.forEach((code: string) => {
        if (!riskMap[code]) {
          riskMap[code] = {
            maxSeverity: 0,
            clusterCount: 0,
            recentArticles: 0,
            lastActivity: null,
            riskLevel: 'none',
          }
        }
        riskMap[code].maxSeverity = Math.max(riskMap[code].maxSeverity, cluster.severity || 0)
        riskMap[code].clusterCount++
        
        const clusterDate = new Date(cluster.updated_at)
        if (!riskMap[code].lastActivity || clusterDate > riskMap[code].lastActivity) {
          riskMap[code].lastActivity = clusterDate
        }
      })
    })
    
    // Procesar artículos (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    articles.forEach((article: any) => {
      article.countries?.forEach((code: string) => {
        if (!riskMap[code]) {
          riskMap[code] = {
            maxSeverity: 0,
            clusterCount: 0,
            recentArticles: 0,
            lastActivity: null,
            riskLevel: 'none',
          }
        }
        const articleDate = new Date(article.published_at)
        if (articleDate > oneDayAgo) {
          riskMap[code].recentArticles++
        }
        if (!riskMap[code].lastActivity || articleDate > riskMap[code].lastActivity) {
          riskMap[code].lastActivity = articleDate
        }
      })
    })
    
    // Determinar nivel de riesgo
    Object.keys(riskMap).forEach(code => {
      const data = riskMap[code]
      if (data.maxSeverity > 60) {
        data.riskLevel = 'critical'
      } else if (data.maxSeverity > 40) {
        data.riskLevel = 'high'
      } else if (data.maxSeverity > 20 || data.clusterCount > 0) {
        data.riskLevel = 'medium'
      } else if (data.recentArticles > 0) {
        data.riskLevel = 'low'
      } else {
        data.riskLevel = 'none'
      }
    })
    
    return riskMap
  }, [clusters, articles])

  // Get unique regions
  const regions: string[] = countries
    ? Array.from(new Set(countries.map((c: any) => c.region))).sort() as string[]
    : []

  // Filter countries
  const filteredCountries = countries?.filter((country: any) => {
    if (search) {
      const searchLower = search.toLowerCase()
      if (
        !country.name.toLowerCase().includes(searchLower) &&
        !country.code.toLowerCase().includes(searchLower) &&
        !(country.capital?.toLowerCase().includes(searchLower))
      ) {
        return false
      }
    }

    if (regionFilter !== 'all' && country.region !== regionFilter) {
      return false
    }

    if (watchlistOnly && !country.watchlist) {
      return false
    }

    // Filtrar por nivel de riesgo
    if (riskFilter !== 'all') {
      const riskData = countryRiskData[country.code]
      const riskLevel = riskData?.riskLevel || 'none'
      if (riskFilter === 'has-risk' && riskLevel === 'none') {
        return false
      }
      if (riskFilter !== 'has-risk' && riskLevel !== riskFilter) {
        return false
      }
    }

    return true
  })

  // Ordenar países según campo seleccionado
  const sortedCountries = useMemo(() => {
    if (!filteredCountries) return []
    
    return [...filteredCountries].sort((a, b) => {
      const riskA = countryRiskData[a.code]
      const riskB = countryRiskData[b.code]
      const enrichedA = enrichedCountriesData?.[a.code]
      const enrichedB = enrichedCountriesData?.[b.code]
      
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'severity':
          comparison = (riskB?.maxSeverity || 0) - (riskA?.maxSeverity || 0)
          break
        case 'clusters':
          comparison = (riskB?.clusterCount || 0) - (riskA?.clusterCount || 0)
          break
        case 'articles':
          comparison = (riskB?.recentArticles || 0) - (riskA?.recentArticles || 0)
          break
        case 'activity':
          const timeA = riskA?.lastActivity?.getTime() || 0
          const timeB = riskB?.lastActivity?.getTime() || 0
          comparison = timeB - timeA
          break
      }
      
      return sortDirection === 'asc' ? -comparison : comparison
    })
  }, [filteredCountries, countryRiskData, enrichedCountriesData, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const watchlistCount = countries?.filter((c: any) => c.watchlist).length || 0

  // Calcular estadísticas de riesgo
  const riskStats = useMemo(() => {
    const criticalCount = Object.values(countryRiskData).filter(r => r.riskLevel === 'critical').length
    const highCount = Object.values(countryRiskData).filter(r => r.riskLevel === 'high').length
    const totalAtRisk = Object.values(countryRiskData).filter(r => r.riskLevel !== 'none').length
    return { criticalCount, highCount, totalAtRisk }
  }, [countryRiskData])

  return (
    <div className="space-y-4">
      {/* Header - Classified Style */}
      <div className="border-b border-intel-border pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-intel-text-bright"></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-mono font-bold text-intel-text tracking-tight">
                    COUNTRY INTELLIGENCE DATABASE
                  </h1>
                  {clusters && (
                    <Badge variant="outline" className="font-mono text-xs border-green-500/50 text-green-400">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                      LIVE
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-intel-muted mt-1 font-mono uppercase tracking-wider">
                  CLASSIFIED // ACTIVE MONITORING // REAL-TIME THREAT ASSESSMENT
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {riskStats.criticalCount > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 font-mono text-xs px-2 py-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {riskStats.criticalCount} CRITICAL
              </Badge>
            )}
            {riskStats.highCount > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 font-mono text-xs px-2 py-1">
                <Target className="h-3 w-3 mr-1" />
                {riskStats.highCount} HIGH
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs px-2 py-1">
              <Star className="h-3 w-3 mr-1 fill-intel-text-dim" />
              {watchlistCount} WATCHLIST
            </Badge>
            {riskStats.totalAtRisk > 0 && (
              <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                <Shield className="h-3 w-3 mr-1" />
                {riskStats.totalAtRisk} ACTIVE
              </Badge>
            )}
          </div>
        </div>

        {/* Filters - Professional Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative flex-1 lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-intel-muted" />
            <Input
              placeholder="SEARCH: Name, Code, Capital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-mono text-xs"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="REGION" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL REGIONS</SelectItem>
              {regions.map((region: string) => (
                <SelectItem key={region} value={region}>
                  {region.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="THREAT LEVEL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL LEVELS</SelectItem>
              <SelectItem value="has-risk">HAS RISK</SelectItem>
              <SelectItem value="critical">🔴 CRITICAL</SelectItem>
              <SelectItem value="high">🟠 HIGH</SelectItem>
              <SelectItem value="medium">🟡 MEDIUM</SelectItem>
              <SelectItem value="low">🔵 LOW</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 border border-intel-border rounded px-3 py-2 bg-intel-surface">
            <Switch
              checked={watchlistOnly}
              onCheckedChange={setWatchlistOnly}
              className="scale-75"
            />
            <span className="text-xs text-intel-muted font-mono uppercase">WATCHLIST</span>
          </div>
        </div>
      </div>

      {/* Countries Table - Professional Intelligence Style */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sortedCountries && sortedCountries.length > 0 ? (
        <Card className="intel-card border-intel-border">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-intel-bg border-b-2 border-intel-border">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 text-xs font-mono uppercase text-intel-muted hover:text-intel-text transition-colors"
                      >
                        COUNTRY
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('severity')}
                        className="flex items-center gap-2 text-xs font-mono uppercase text-intel-muted hover:text-intel-text transition-colors"
                      >
                        THREAT LEVEL
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSort('clusters')}
                        className="flex items-center gap-2 text-xs font-mono uppercase text-intel-muted hover:text-intel-text transition-colors mx-auto"
                      >
                        CLUSTERS
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSort('articles')}
                        className="flex items-center gap-2 text-xs font-mono uppercase text-intel-muted hover:text-intel-text transition-colors mx-auto"
                      >
                        24H ACTIVITY
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('activity')}
                        className="flex items-center gap-2 text-xs font-mono uppercase text-intel-muted hover:text-intel-text transition-colors"
                      >
                        LAST UPDATE
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono uppercase text-intel-muted">
                      INTELLIGENCE
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-mono uppercase text-intel-muted">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCountries.map((country, index) => {
                    const riskData = countryRiskData[country.code]
                    const riskLevel = riskData?.riskLevel || 'none'
                    const enriched = enrichedCountriesData?.[country.code]
                    
                    const getThreatLevelBadge = () => {
                      if (!riskData || riskData.maxSeverity === 0) {
                        return <span className="text-xs font-mono text-intel-muted">NO THREAT</span>
                      }
                      const color = getSeverityColor(riskData.maxSeverity)
                      const level = riskLevel === 'critical' ? 'CRITICAL' :
                                   riskLevel === 'high' ? 'HIGH' :
                                   riskLevel === 'medium' ? 'MEDIUM' :
                                   riskLevel === 'low' ? 'LOW' : 'NONE'
                      return (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`}></div>
                          <span className={`text-xs font-mono font-bold ${color}`}>
                            {level}
                          </span>
                          <span className="text-xs font-mono text-intel-muted">
                            [{riskData.maxSeverity}]
                          </span>
                        </div>
                      )
                    }

                    const formatLastActivity = () => {
                      if (!riskData?.lastActivity) return <span className="text-intel-muted">—</span>
                      return (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-intel-muted" />
                          <span className="text-xs font-mono text-intel-muted">
                            {formatRelativeTime(riskData.lastActivity.toISOString())}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <tr
                        key={country.id}
                        className={`border-b border-intel-border hover:bg-intel-surface/50 transition-colors ${
                          riskLevel === 'critical' ? 'bg-red-500/5' :
                          riskLevel === 'high' ? 'bg-orange-500/5' :
                          ''
                        }`}
                      >
                        {/* Country */}
                        <td className="px-4 py-3">
                          <Link href={`/countries/${country.code}`} className="flex items-center gap-3 group">
                            <CountryFlag code={country.code} name={country.name} size="sm" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold text-intel-text group-hover:text-intel-text-bright">
                                  {country.name.toUpperCase()}
                                </span>
                                {country.watchlist && (
                                  <Star className="h-3 w-3 text-intel-text fill-intel-text-dim" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono text-intel-muted">{country.code}</span>
                                {enriched?.capital && (
                                  <>
                                    <span className="text-intel-muted">•</span>
                                    <span className="text-xs font-mono text-intel-muted flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {enriched.capital}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Threat Level */}
                        <td className="px-4 py-3">
                          {getThreatLevelBadge()}
                        </td>

                        {/* Clusters */}
                        <td className="px-4 py-3 text-center">
                          {riskData && riskData.clusterCount > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <Activity className="h-3 w-3 text-intel-muted" />
                              <span className="text-xs font-mono font-bold text-intel-text">
                                {riskData.clusterCount}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-intel-muted">—</span>
                          )}
                        </td>

                        {/* 24h Activity */}
                        <td className="px-4 py-3 text-center">
                          {riskData && riskData.recentArticles > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <FileText className="h-3 w-3 text-intel-muted" />
                              <span className="text-xs font-mono font-bold text-intel-text">
                                {riskData.recentArticles}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-intel-muted">—</span>
                          )}
                        </td>

                        {/* Last Update */}
                        <td className="px-4 py-3">
                          {formatLastActivity()}
                        </td>

                        {/* Intelligence Data */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {enriched?.borders && enriched.borders.length > 0 && (
                              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
                                <Globe className="h-3 w-3 mr-1" />
                                {enriched.borders.length} BORDERS
                              </Badge>
                            )}
                            {enriched?.population && (
                              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
                                <Users className="h-3 w-3 mr-1" />
                                {(enriched.population / 1e6).toFixed(1)}M
                              </Badge>
                            )}
                            {enriched?.area && (
                              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
                                {(enriched.area / 1000).toFixed(0)}K km²
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <Link href={`/countries/${country.code}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-mono text-xs h-7 px-2"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              VIEW
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </Card>
      ) : (
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Flag className="h-16 w-16 text-intel-muted mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              No countries found
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md">
              {search || regionFilter !== 'all' || watchlistOnly
                ? 'Try adjusting your filters'
                : 'Countries will appear here once configured'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


