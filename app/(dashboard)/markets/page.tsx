'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/lib/store'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonChart } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Fuel,
  Shield,
  Activity,
  BarChart3,
  LineChart,
  AlertTriangle,
  ExternalLink,
  Star,
  Plus,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  X,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Zap,
  Target,
  Globe,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Brain,
  Link2,
  ArrowRight,
} from 'lucide-react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts'
import type { Database } from '@/types/database'
import { searchSymbols } from '@/lib/markets/finnhub'
import { MarketDashboard } from './components/market-dashboard'
import { ImportSymbolsDialog } from './components/import-symbols-dialog'
import { InfoDropdown } from '@/components/ui/info-dropdown'

type MarketSymbol = Database['public']['Tables']['market_symbols']['Row']
type MarketQuote = Database['public']['Tables']['market_quotes']['Row']

// Market regime indicators
const regimeIndicators = [
  { id: 'risk', label: 'Régimen de riesgo', icon: Activity },
  { id: 'volatility', label: 'Volatilidad', icon: BarChart3 },
  { id: 'usd', label: 'Fuerza del USD', icon: DollarSign },
  { id: 'energy', label: 'Proxy energético', icon: Fuel },
]

const assetTypeLabels: Record<string, string> = {
  stock: 'Acciones',
  index: 'Índices',
  forex: 'Divisas',
  commodity: 'Materias primas',
  crypto: 'Cripto',
}

interface Filters {
  search: string
  type: string[]
  sector: string[]
  country: string[]
  priceRange: { min: number | null; max: number | null }
  changeRange: { min: number | null; max: number | null }
  volumeMin: number | null
}

function QuoteCard({
  symbol,
  quote,
  isSelected,
  onToggleSelect,
}: {
  symbol: MarketSymbol
  quote?: MarketQuote
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  const change = quote?.change_percent || 0
  const isPositive = change > 0
  const isNegative = change < 0
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <Card
      className={`intel-card hover:border-intel-accent/50 transition-colors cursor-pointer ${
        isSelected ? 'border-intel-accent ring-2 ring-intel-accent/20' : ''
      }`}
      onClick={onToggleSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/markets/symbol/${symbol.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-mono font-semibold text-intel-text hover:text-intel-accent"
              >
                {symbol.symbol}
              </Link>
              <Badge variant="outline" className="text-[10px]">
                {symbol.type.toUpperCase()}
              </Badge>
              {symbol.sector && (
                <Badge variant="outline" className="text-[9px] bg-intel-border/50">
                  {symbol.sector}
                </Badge>
              )}
            </div>
            <p className="text-xs text-intel-muted truncate max-w-48 mb-2">
              {symbol.name}
            </p>
            {symbol.country && (
              <div className="flex items-center gap-1 text-xs text-intel-muted">
                <Globe className="h-3 w-3" />
                {symbol.country}
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <p className="font-mono text-lg text-intel-text">
              {quote ? `$${quote.price.toFixed(2)}` : '—'}
            </p>
            <p
              className={`flex items-center gap-1 text-sm font-mono ${
                isPositive
                  ? 'text-emerald-400'
                  : isNegative
                  ? 'text-red-400'
                  : 'text-intel-muted'
              }`}
            >
              <TrendIcon className="h-3 w-3" />
              {change > 0 ? '+' : ''}
              {change.toFixed(2)}%
            </p>
            {quote?.volume && (
              <p className="text-xs text-intel-muted mt-1">
                Vol: {(quote.volume / 1000000).toFixed(1)}M
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdvancedFilters({
  filters,
  onFiltersChange,
  availableTypes,
  availableSectors,
  availableCountries,
}: {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  availableTypes: string[]
  availableSectors: string[]
  availableCountries: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="intel-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-intel-accent" />
              Filtros avanzados
            </CardTitle>
            <InfoDropdown
              title="Filtros avanzados"
              content={
                <>
                  <p className="mb-2">
                    Filtra símbolos por <strong>múltiples criterios</strong> para encontrar activos específicos.
                  </p>
                  <p className="mb-2">
                    <strong>Filtros disponibles:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li><strong>Tipo:</strong> Acciones, índices, forex, commodities, crypto</li>
                    <li><strong>Sector:</strong> Energía, tecnología, defensa, etc.</li>
                    <li><strong>País:</strong> Filtrar por país de origen</li>
                    <li><strong>Precio:</strong> Rango mínimo y máximo</li>
                    <li><strong>Cambio %:</strong> Filtrar por rendimiento</li>
                    <li><strong>Volumen:</strong> Volumen mínimo de transacciones</li>
                  </ul>
                  <p className="text-xs mt-2 text-intel-muted/70">
                    Los filtros se combinan (AND) - todos deben cumplirse.
                  </p>
                </>
              }
              side="right"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          {/* Tipo de activo */}
          <div>
            <Label className="text-xs text-intel-muted mb-2 block">Tipo de activo</Label>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((type) => (
                <Button
                  key={type}
                  variant={filters.type.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      type: filters.type.includes(type)
                        ? filters.type.filter((t: string) => t !== type)
                        : [...filters.type, type],
                    })
                  }}
                >
                  {assetTypeLabels[type] || type}
                </Button>
              ))}
            </div>
          </div>

          {/* Sector */}
          {availableSectors.length > 0 && (
            <div>
              <Label className="text-xs text-intel-muted mb-2 block">Sector</Label>
              <Select
                value={filters.sector[0] || 'all'}
                onValueChange={(value) => {
                  onFiltersChange({
                    ...filters,
                    sector: value === 'all' ? [] : [value],
                  })
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableSectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* País */}
          {availableCountries.length > 0 && (
            <div>
              <Label className="text-xs text-intel-muted mb-2 block">País</Label>
              <Select
                value={filters.country[0] || 'all'}
                onValueChange={(value) => {
                  onFiltersChange({
                    ...filters,
                    country: value === 'all' ? [] : [value],
                  })
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableCountries.map((country: string) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rango de precio */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-intel-muted mb-2 block">Precio mínimo</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.priceRange.min || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    priceRange: {
                      ...filters.priceRange,
                      min: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-intel-muted mb-2 block">Precio máximo</Label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.priceRange.max || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    priceRange: {
                      ...filters.priceRange,
                      max: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Rango de cambio */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-intel-muted mb-2 block">Cambio % min</Label>
              <Input
                type="number"
                placeholder="-100"
                value={filters.changeRange.min || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    changeRange: {
                      ...filters.changeRange,
                      min: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-intel-muted mb-2 block">Cambio % max</Label>
              <Input
                type="number"
                placeholder="100"
                value={filters.changeRange.max || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    changeRange: {
                      ...filters.changeRange,
                      max: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Volumen mínimo */}
          <div>
            <Label className="text-xs text-intel-muted mb-2 block">Volumen mínimo (M)</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.volumeMin || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  volumeMin: e.target.value ? parseFloat(e.target.value) * 1000000 : null,
                })
              }}
              className="h-8 text-xs"
            />
          </div>

          {/* Reset filters */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onFiltersChange({
                search: '',
                type: [],
                sector: [],
                country: [],
                priceRange: { min: null, max: null },
                changeRange: { min: null, max: null },
                volumeMin: null,
              })
            }}
          >
            <X className="h-3 w-3 mr-2" />
            Limpiar filtros
          </Button>
        </CardContent>
      )}
    </Card>
  )
}


function UpdateMarketDataButton() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/markets/update', {
        method: 'POST',
        headers: { 'x-manual-trigger': 'true' },
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update market data')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['market-quotes'] })
      queryClient.invalidateQueries({ queryKey: ['market-ohlcv'] })
      queryClient.invalidateQueries({ queryKey: ['market-symbols'] })
      
      toast({
        title: 'Datos actualizados',
        description: `Actualizados ${data.results?.quotes_updated || 0} cotizaciones, ${data.results?.ohlcv_updated || 0} registros OHLCV`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error en actualización',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Actualizando...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar datos
          </>
        )}
      </Button>
      <InfoDropdown
        title="Actualizar datos"
        content={
          <>
            <p className="mb-2">
              Actualiza <strong>cotizaciones y datos históricos</strong> desde Finnhub.
            </p>
            <p className="mb-2">
              <strong>¿Qué actualiza?</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li><strong>Quotes:</strong> Precios actuales, cambios, volumen (todos los símbolos)</li>
              <li><strong>OHLCV:</strong> Datos históricos de últimos 30 días (solo símbolos activos)</li>
            </ul>
            <p className="mb-2">
              <strong>Rate limiting:</strong> El sistema respeta automáticamente 60 requests/minuto de Finnhub.
              Con 150+ símbolos, puede tomar 3-5 minutos.
            </p>
            <p className="text-xs mt-2 text-intel-muted/70">
              Los datos se actualizan automáticamente cada minuto en la UI, pero este botón fuerza una actualización completa desde la API.
            </p>
          </>
        }
        side="bottom"
      />
    </div>
  )
}

function RegimePanel() {
  const { marketRegime, setMarketRegime } = useUIStore()

  // Mock regime data - in production this would be calculated from market data
  const regimeData = {
    risk: { value: marketRegime === 'risk-on' ? 75 : marketRegime === 'risk-off' ? 25 : 50, label: marketRegime },
    volatility: { value: 35, label: 'Baja' },
    usd: { value: 62, label: 'Moderada' },
    energy: { value: 58, label: 'Elevada' },
  }

  return (
    <Card className="intel-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Activity className="h-4 w-4 text-intel-accent" />
            Régimen de mercado
          </CardTitle>
          <InfoDropdown
            title="Régimen de mercado"
            content={
              <>
                <p className="mb-2">
                  Los regímenes de mercado indican el <strong>estado general del sentimiento</strong> y pueden servir como señales geopolíticas.
                </p>
                <p className="mb-2">
                  <strong>Indicadores:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li><strong>Régimen de riesgo:</strong> Risk-on (apetito por riesgo) vs Risk-off (aversión al riesgo)</li>
                  <li><strong>Volatilidad:</strong> Nivel de incertidumbre en los mercados</li>
                  <li><strong>Fuerza del USD:</strong> Fortaleza del dólar como refugio</li>
                  <li><strong>Proxy energético:</strong> Precios de energía como indicador geopolítico</li>
                </ul>
                <p className="text-xs mt-2 text-intel-muted/70">
                  Puedes ajustar manualmente el régimen de riesgo para filtrar análisis.
                </p>
              </>
            }
            side="right"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {regimeIndicators.map((indicator) => {
          const data = regimeData[indicator.id as keyof typeof regimeData]
          const Icon = indicator.icon
          return (
            <div key={indicator.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-intel-border">
                <Icon className="h-4 w-4 text-intel-text" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-intel-muted">{indicator.label}</span>
                  <span className="text-xs font-mono text-intel-text">{data.label}</span>
                </div>
                <div className="h-1.5 rounded-none bg-intel-border overflow-hidden">
                  <div
                    className="h-full rounded-none transition-all bg-intel-text-dim"
                    style={{ width: `${data.value}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        <div className="pt-2 flex gap-2">
          {(['risk-on', 'neutral', 'risk-off'] as const).map((regime) => (
            <Button
              key={regime}
              variant={marketRegime === regime ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setMarketRegime(regime)}
            >
              {regime.replace('-', ' ')}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MarketsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { selectedSymbols, addSymbol, removeSymbol } = useUIStore()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: [],
    sector: [],
    country: [],
    priceRange: { min: null, max: null },
    changeRange: { min: null, max: null },
    volumeMin: null,
  })
  const [comparisonMode, setComparisonMode] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Fetch symbols
  const { data: symbols, isLoading: symbolsLoading } = useQuery({
    queryKey: ['market-symbols'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('market_symbols')
        .select('*')
        .eq('is_active', true)
        .order('symbol')

      if (error) throw error
      return data as MarketSymbol[]
    },
  })

  // Fetch latest quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['market-quotes'],
    queryFn: async () => {
      if (!symbols || symbols.length === 0) return {}

      const symbolIds = symbols.map((s: any) => s.id)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('market_quotes')
        .select('*')
        .in('symbol_id', symbolIds)
        .order('timestamp', { ascending: false })

      if (error) throw error

      const latestQuotes: Record<string, MarketQuote> = {}
      if (data) {
        data.forEach((quote: MarketQuote) => {
          if (!latestQuotes[quote.symbol_id]) {
            latestQuotes[quote.symbol_id] = quote
          }
        })
      }

      return latestQuotes
    },
    enabled: !!symbols && symbols.length > 0,
    refetchInterval: 60000, // Refresh every minute
  })

  // Search symbols
  const handleSearch = async (query: string) => {
    setFilters({ ...filters, search: query })
    if (query.length > 2) {
      setIsSearching(true)
      try {
        const results = await searchSymbols(query)
        setSearchResults(results.slice(0, 10))
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    } else {
      setSearchResults([])
    }
  }

  // Filter symbols
  const filteredSymbols = useMemo(() => {
    if (!symbols) return []

    let filtered = symbols

    // Tab filter
    if (activeTab === 'watchlist') {
      filtered = filtered.filter((s: any) => selectedSymbols.includes(s.id))
    } else if (activeTab !== 'all') {
      filtered = filtered.filter((s: any) => s.type === activeTab)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (s: any) =>
          s.symbol.toLowerCase().includes(searchLower) ||
          s.name.toLowerCase().includes(searchLower)
      )
    }

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter((s: any) => filters.type.includes(s.type))
    }

    // Sector filter
    if (filters.sector.length > 0) {
      filtered = filtered.filter((s: any) => s.sector && filters.sector.includes(s.sector))
    }

    // Country filter
    if (filters.country.length > 0) {
      filtered = filtered.filter((s: any) => s.country && filters.country.includes(s.country))
    }

    // Price range filter
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) {
      filtered = filtered.filter((s: any) => {
        const quote = quotes?.[s.id]
        if (!quote) return false
        const price = quote.price
        if (filters.priceRange.min !== null && price < filters.priceRange.min) return false
        if (filters.priceRange.max !== null && price > filters.priceRange.max) return false
        return true
      })
    }

    // Change range filter
    if (filters.changeRange.min !== null || filters.changeRange.max !== null) {
      filtered = filtered.filter((s: any) => {
        const quote = quotes?.[s.id]
        if (!quote) return false
        const change = quote.change_percent
        if (filters.changeRange.min !== null && change < filters.changeRange.min) return false
        if (filters.changeRange.max !== null && change > filters.changeRange.max) return false
        return true
      })
    }

    // Volume filter
    if (filters.volumeMin !== null) {
      filtered = filtered.filter((s: any) => {
        const quote = quotes?.[s.id]
        if (!quote || !quote.volume) return false
        return quote.volume >= filters.volumeMin!
      })
    }

    return filtered
  }, [symbols, activeTab, filters, quotes, selectedSymbols])

  // Get available filter options
  const availableTypes = useMemo(() => {
    if (!symbols) return []
    return Array.from(new Set(symbols.map((s: any) => s.type)))
  }, [symbols])

  const availableSectors = useMemo(() => {
    if (!symbols) return []
    return Array.from(new Set(symbols.map((s: any) => s.sector).filter(Boolean) as string[]))
  }, [symbols])

  const availableCountries = useMemo(() => {
    if (!symbols) return []
    return Array.from(new Set(symbols.map((s: any) => s.country).filter(Boolean) as string[]))
  }, [symbols])

  const isLoading = symbolsLoading || quotesLoading

  const { toast } = useToast()

  const toggleSymbolSelection = (symbolId: string) => {
    const symbol = symbols?.find((s: any) => s.id === symbolId)
    if (selectedSymbols.includes(symbolId)) {
      removeSymbol(symbolId)
      toast({
        title: 'Removido de watchlist',
        description: `${symbol?.symbol || 'Símbolo'} removido de tu watchlist`,
      })
    } else {
      addSymbol(symbolId)
      toast({
        title: 'Añadido a watchlist',
        description: `${symbol?.symbol || 'Símbolo'} añadido a tu watchlist`,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-intel-accent" />
              <h1 className="text-2xl font-mono font-bold text-intel-text">
                Dashboard de mercados
              </h1>
              <InfoDropdown
                title="Dashboard de mercados"
                content={
                  <>
                    <p className="mb-2">
                      Esta página muestra movimientos de mercado como <strong>sensores geopolíticos</strong>, no como oportunidades de inversión.
                    </p>
                    <p className="mb-2">
                      <strong>¿Qué ver aquí?</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      <li>Métricas clave del mercado al inicio</li>
                      <li>Filtros avanzados para encontrar activos específicos</li>
                      <li>Watchlist personal para seguir símbolos importantes</li>
                      <li>Análisis de regímenes de mercado</li>
                    </ul>
                    <p className="text-xs mt-2 text-intel-muted/70">
                      Para ver temas geopolíticos vinculados, visita <strong>Geopolitical Markets</strong>. Para análisis de inteligencia, visita <strong>Market Intelligence</strong>.
                    </p>
                  </>
                }
              />
            </div>
            <p className="text-sm text-intel-muted mt-1">
              Mercados como sensores geopolíticos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {filteredSymbols.length} activos
          </Badge>
          <ImportSymbolsDialog />
          <div className="flex items-center gap-1">
            <Button
              variant={comparisonMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode(!comparisonMode)}
            >
              <Target className="h-4 w-4 mr-2" />
              Comparar
            </Button>
            <InfoDropdown
              title="Modo comparación"
              content={
                <>
                  <p className="mb-2">
                    Activa el modo comparación para <strong>seleccionar múltiples símbolos</strong> y analizarlos juntos.
                  </p>
                  <p className="mb-2">
                    <strong>Uso:</strong>
                  </p>
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      <li>Activa el modo comparación</li>
                      <li>Haz clic en los símbolos que quieres comparar</li>
                      <li>Los símbolos seleccionados se añaden a tu watchlist</li>
                      <li>Los símbolos seleccionados se resaltan visualmente</li>
                    </ul>
                  <p className="text-xs mt-2 text-intel-muted/70">
                    También puedes agregar símbolos a tu watchlist haciendo clic en ellos.
                  </p>
                </>
              }
              side="bottom"
            />
          </div>
          <UpdateMarketDataButton />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/markets/geopolitical"
          className="group p-4 rounded-lg border border-intel-border/50 bg-intel-border/10 hover:border-intel-accent/50 hover:bg-intel-accent/5 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded bg-intel-accent/10 group-hover:bg-intel-accent/20 transition-colors">
                <Link2 className="h-5 w-5 text-intel-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-intel-text group-hover:text-intel-accent transition-colors">
                  Mercados geopolíticos
                </h3>
                <p className="text-xs text-intel-muted mt-1">
                  Eventos geopolíticos vinculados a símbolos de mercado con explicación del impacto
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-intel-muted group-hover:text-intel-accent transition-colors shrink-0 mt-1" />
          </div>
        </Link>
        <Link
          href="/markets/intelligence"
          className="group p-4 rounded-lg border border-intel-border/50 bg-intel-border/10 hover:border-intel-accent/50 hover:bg-intel-accent/5 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded bg-intel-accent/10 group-hover:bg-intel-accent/20 transition-colors">
                <Brain className="h-5 w-5 text-intel-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-intel-text group-hover:text-intel-accent transition-colors">
                  Market Intelligence
                </h3>
                <p className="text-xs text-intel-muted mt-1">
                  Análisis de inteligencia con escenarios, hipótesis y planes de trading basados en eventos geopolíticos
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-intel-muted group-hover:text-intel-accent transition-colors shrink-0 mt-1" />
          </div>
        </Link>
      </div>

      {/* Market Dashboard Metrics */}
      {symbols && quotes && Object.keys(quotes).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-mono font-semibold text-intel-text">
              Métricas clave
            </h2>
            <InfoDropdown
              title="Métricas clave"
              content={
                <>
                  <p className="mb-2">
                    Vista rápida del <strong>estado general del mercado</strong>.
                  </p>
                  <p className="mb-2">
                    <strong>Métricas mostradas:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li><strong>Total activos:</strong> Número de símbolos monitoreados</li>
                    <li><strong>Cambio promedio:</strong> Tendencia general del mercado</li>
                    <li><strong>Tendencia:</strong> Número de activos en positivo vs negativo</li>
                    <li><strong>Alta volatilidad:</strong> Símbolos con cambios {'>'}5% (posibles señales)</li>
                    <li><strong>Mayores ganadores/perdedores:</strong> Top 3 movimientos</li>
                  </ul>
                  <p className="text-xs mt-2 text-intel-muted/70">
                    Estas métricas se actualizan automáticamente cada minuto.
                  </p>
                </>
              }
            />
          </div>
          <MarketDashboard symbols={symbols} quotes={quotes} />
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-intel-muted" />
          <span className="text-sm font-mono text-intel-text">Búsqueda</span>
          <InfoDropdown
            title="Búsqueda de símbolos"
            content={
              <>
                <p className="mb-2">
                  Busca símbolos por <strong>código o nombre</strong> usando la API de Finnhub.
                </p>
                <p className="mb-2">
                  <strong>Ejemplos:</strong> AAPL, MSFT, BTC-USD, EURUSD=X, CL=F
                </p>
                <p className="text-xs mt-2 text-intel-muted/70">
                  La búsqueda se realiza en tiempo real y muestra sugerencias mientras escribes.
                </p>
              </>
            }
          />
        </div>
        <Input
          placeholder="Buscar símbolos (ej: AAPL, TSLA, BTC)..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-intel-muted" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <RegimePanel />

          {/* Advanced Filters */}
          <AdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableTypes={availableTypes}
            availableSectors={availableSectors}
            availableCountries={availableCountries}
          />

          {/* Watchlist summary */}
          <Card className="intel-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <Star className="h-4 w-4 text-intel-text-dim" />
                  Watchlist
                </CardTitle>
                <InfoDropdown
                  title="Watchlist"
                  content={
                    <>
                      <p className="mb-2">
                        Tu lista personal de símbolos para <strong>seguimiento prioritario</strong>.
                      </p>
                      <p className="mb-2">
                        <strong>¿Cómo usar?</strong>
                      </p>
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      <li>Haz clic en cualquier símbolo para agregarlo/quitar de la watchlist</li>
                      <li>Usa la pestaña "Watchlist" para ver solo tus símbolos</li>
                      <li>Los símbolos seleccionados se guardan automáticamente</li>
                    </ul>
                      <p className="text-xs mt-2 text-intel-muted/70">
                        La watchlist se guarda localmente en tu navegador.
                      </p>
                    </>
                  }
                  side="right"
                />
              </div>
            </CardHeader>
            <CardContent>
              {selectedSymbols.length > 0 ? (
                <div className="space-y-2">
                  {symbols
                    ?.filter((s: any) => selectedSymbols.includes(s.id))
                    .slice(0, 5)
                    .map((symbol: any) => {
                      const quote = quotes?.[symbol.id]
                      const change = quote?.change_percent || 0
                      return (
                        <div key={symbol.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-intel-text">{symbol.symbol}</span>
                          <span
                            className={`font-mono ${
                              change > 0
                                ? 'text-emerald-400'
                                : change < 0
                                ? 'text-red-400'
                                : 'text-intel-muted'
                            }`}
                          >
                            {change > 0 ? '+' : ''}{change.toFixed(2)}%
                          </span>
                        </div>
                      )
                    })}
                  {selectedSymbols.length > 5 && (
                    <p className="text-xs text-intel-muted text-center">
                      +{selectedSymbols.length - 5} más
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-intel-muted text-center py-4">
                  No hay activos en watchlist
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-mono font-semibold text-intel-text">
              Símbolos de mercado
            </h2>
            <InfoDropdown
              title="Símbolos de mercado"
              content={
                <>
                  <p className="mb-2">
                    Lista completa de <strong>símbolos monitoreados</strong> organizados por tipo.
                  </p>
                  <p className="mb-2">
                    <strong>Funcionalidades:</strong>
                  </p>
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      <li><strong>Selección:</strong> Haz clic en cualquier card para agregar/quitar de watchlist</li>
                      <li><strong>Filtros:</strong> Usa los filtros avanzados del sidebar para encontrar símbolos específicos</li>
                      <li><strong>Búsqueda:</strong> Busca por código o nombre en la barra superior</li>
                      <li><strong>Comparación:</strong> Activa el modo comparación para seleccionar múltiples símbolos</li>
                      <li><strong>Detalles:</strong> Haz clic en el símbolo para ver gráfica, noticias y eventos geopolíticos</li>
                    </ul>
                  <p className="text-xs mt-2 text-intel-muted/70">
                    Cada símbolo muestra precio actual, cambio porcentual, volumen y tipo de activo.
                  </p>
                </>
              }
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="watchlist">
                <Star className="h-3 w-3 mr-1" />
                Watchlist
              </TabsTrigger>
              {availableTypes.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {assetTypeLabels[type] || type}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : filteredSymbols && filteredSymbols.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                    {filteredSymbols.map((symbol: any) => (
                      <QuoteCard
                        key={symbol.id}
                        symbol={symbol}
                        quote={quotes?.[symbol.id]}
                        isSelected={selectedSymbols.includes(symbol.id)}
                        onToggleSelect={() => toggleSymbolSelection(symbol.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Card className="intel-card">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <TrendingUp className="h-16 w-16 text-intel-muted mb-4" />
                    <h3 className="text-lg font-medium text-intel-text mb-2">
                      {activeTab === 'watchlist' ? 'No hay activos en watchlist' : 'No se encontraron activos'}
                    </h3>
                    <p className="text-sm text-intel-muted text-center max-w-md">
                      {activeTab === 'watchlist'
                        ? 'Agrega activos a tu watchlist para rastrearlos aquí.'
                        : filters.search || Object.values(filters).some(v => 
                            Array.isArray(v) ? v.length > 0 : v !== null && v !== ''
                          )
                        ? 'Intenta ajustar los filtros de búsqueda.'
                        : 'Configura símbolos de mercado en la configuración de administración.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="intel-card border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-intel-text-dim shrink-0 mt-0.5" />
            <div className="text-xs text-intel-muted">
              <p className="font-medium text-intel-text mb-1">Solo uso analítico</p>
              <p>
                Los datos de mercado se proporcionan únicamente para análisis geopolítico. Esto NO es
                consejo de inversión. Intel Desk no hace predicciones de precios. Los movimientos de mercado
                se muestran como posibles señales de estrés geopolítico, no como recomendaciones de inversión.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
