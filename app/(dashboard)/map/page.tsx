'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/lib/store'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Globe,
  Layers,
  AlertTriangle,
  FileText,
  TrendingUp,
  MapPin,
} from 'lucide-react'
import type { Database } from '@/types/database'

// Import map component dynamically since it requires window
import dynamic from 'next/dynamic'
import CountrySidebar from '@/components/map/country-sidebar'

const GeopoliticalMapComponent = dynamic(() => import('@/components/map/mapbox-globe-view'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-intel-surface">
      <div className="text-center">
        <Globe className="h-12 w-12 text-intel-muted animate-pulse mx-auto mb-2" />
        <p className="text-sm text-intel-muted">Cargando globo...</p>
      </div>
    </div>
  ),
})


type Cluster = Database['public']['Tables']['clusters']['Row']
type Article = Database['public']['Tables']['articles']['Row']
type MarketSymbol = Database['public']['Tables']['market_symbols']['Row']
type MarketQuote = Database['public']['Tables']['market_quotes']['Row']

interface MapLayer {
  id: string
  name: string
  visible: boolean
  type: 'clusters' | 'articles' | 'markets'
}

export default function MapPage() {
  const supabase = createClient()
  const { selectedCountry, setSelectedCountry, mapStyle, setMapStyle } = useUIStore()
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [layersExpanded, setLayersExpanded] = useState(false)
  const layersMenuRef = useRef<HTMLDivElement>(null)

  // Close layers menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layersMenuRef.current && !layersMenuRef.current.contains(event.target as Node)) {
        setLayersExpanded(false)
      }
    }

    if (layersExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [layersExpanded])
  const [layers, setLayers] = useState<MapLayer[]>([
    { id: 'clusters', name: 'Event clusters', visible: true, type: 'clusters' },
    { id: 'articles', name: 'Artículos', visible: true, type: 'articles' },
    { id: 'markets', name: 'Mercados', visible: true, type: 'markets' },
    { id: 'alliances', name: 'Alianzas', visible: false, type: 'clusters' },
    { id: 'ai-locations', name: 'Ubicaciones AI', visible: true, type: 'clusters' },
  ])

  // Fetch countries
  const { data: countries, isLoading: countriesLoading, error: countriesError } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      console.log('Fetching countries...')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('countries')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching countries:', error)
        throw error
      }
      console.log('Countries fetched:', data?.length || 0)
      return data || []
    },
  })

  // Fetch recent clusters (with real-time updates)
  const { data: clusters, isLoading: clustersLoading, error: clustersError } = useQuery({
    queryKey: ['clusters', 'map'],
    queryFn: async () => {
      console.log('Fetching clusters for map...')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('severity', { ascending: false })
        .limit(200) // Increased limit to show more locations

      if (error) {
        console.error('Error fetching clusters:', error)
        throw error
      }
      console.log('Clusters fetched:', data?.length || 0)
      return data
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  })

  // Fetch recent articles
  const { data: articles, isLoading: articlesLoading, error: articlesError } = useQuery({
    queryKey: ['articles', 'map'],
    queryFn: async () => {
      console.log('Fetching articles for map...')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('articles')
        .select('*')
        .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('published_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Error fetching articles:', error)
        throw error
      }
      console.log('Articles fetched:', data?.length || 0)
      return data || []
    },
  })

  // Fetch market symbols with latest quotes
  const { data: marketSymbols, isLoading: marketsLoading } = useQuery({
    queryKey: ['market-symbols', 'map'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: symbols, error: symbolsError } = await (supabase as any)
        .from('market_symbols')
        .select('*')
        .eq('is_active', true)
        .not('country', 'is', null)
        .limit(300)

      if (symbolsError) throw symbolsError

      // Get latest quotes for each symbol
      const symbolsWithQuotes = await Promise.all(
        (symbols || []).map(async (symbol: any) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: quote, error: quoteError } = await (supabase as any)
              .from('market_quotes')
              .select('*')
              .eq('symbol_id', symbol.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle()

            // Ignore errors if no quote exists
            if (quoteError && quoteError.code !== 'PGRST116') {
              console.warn(`Error fetching quote for ${symbol.symbol}:`, quoteError)
            }

            return { ...symbol, quote: quote || undefined }
          } catch (error) {
            console.warn(`Error fetching quote for ${symbol.symbol}:`, error)
            return { ...symbol, quote: undefined }
          }
        })
      )

      return symbolsWithQuotes
    },
  })

  // Get selected country details
  const selectedCountryData = countries?.find((c: any) => c.code === selectedCountry)

  // Debug logs
  console.log('Map page data:', {
    countries: countries?.length || 0,
    clusters: clusters?.length || 0,
    articles: articles?.length || 0,
    marketSymbols: marketSymbols?.length || 0,
    countriesLoading,
    clustersLoading,
    articlesLoading,
    marketsLoading,
    countriesError,
    clustersError,
    articlesError,
  })

  // Show error messages if data failed to load
  if (countriesError) {
    console.error('Countries error details:', countriesError)
  }
  if (clustersError) {
    console.error('Clusters error details:', clustersError)
  }
  if (articlesError) {
    console.error('Articles error details:', articlesError)
  }

  // Filter clusters by severity
  const filteredClusters = clusters?.filter((c: any) => {
    if (severityFilter === 'all') return true
    if (severityFilter === 'high') return (c.severity || 0) >= 70
    if (severityFilter === 'medium') return (c.severity || 0) >= 40 && (c.severity || 0) < 70
    return (c.severity || 0) < 40
  })

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 relative">
      {/* Map container */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-intel-border">
        {/* Map controls */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as 'dark' | 'satellite')}>
            <SelectTrigger className="w-40 bg-intel-surface/95 backdrop-blur border-intel-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Oscuro</SelectItem>
              <SelectItem value="satellite">Satélite</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={severityFilter}
            onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}
          >
            <SelectTrigger className="w-40 bg-intel-surface/95 backdrop-blur border-intel-border">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los eventos</SelectItem>
              <SelectItem value="high">Alta severidad</SelectItem>
              <SelectItem value="medium">Media severidad</SelectItem>
              <SelectItem value="low">Baja severidad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compact Layer controls */}
        <div className="absolute top-4 right-4 z-10" ref={layersMenuRef}>
          <button
            onClick={() => setLayersExpanded(!layersExpanded)}
            className="bg-intel-surface/95 backdrop-blur border border-intel-border rounded-lg p-2 shadow-lg hover:bg-intel-border transition-colors"
            aria-label="Toggle layers menu"
          >
            <Layers className="h-5 w-5 text-intel-accent" />
          </button>
          
          {layersExpanded && (
            <div className="absolute top-12 right-0 bg-intel-surface/95 backdrop-blur border border-intel-border rounded-lg p-3 shadow-lg w-64 max-h-[calc(100vh-12rem)] overflow-y-auto animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm font-mono text-intel-text">Capas</span>
                <button
                  onClick={() => setLayersExpanded(false)}
                  className="text-intel-muted hover:text-intel-text text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Layer Toggles - Compact */}
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor={`layer-${layer.id}`}
                      className="text-xs text-intel-text cursor-pointer flex items-center gap-2"
                    >
                      {layer.type === 'clusters' && <AlertTriangle className="h-3 w-3" />}
                      {layer.type === 'articles' && <FileText className="h-3 w-3" />}
                      {layer.type === 'markets' && <TrendingUp className="h-3 w-3" />}
                      {layer.id === 'alliances' && <Globe className="h-3 w-3" />}
                      {layer.id === 'ai-locations' && <MapPin className="h-3 w-3" />}
                      {layer.name}
                    </Label>
                    <Switch
                      id={`layer-${layer.id}`}
                      checked={layer.visible}
                      onCheckedChange={() => toggleLayer(layer.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        {countriesLoading || clustersLoading || articlesLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-intel-surface">
            <div className="text-center">
              <Globe className="h-12 w-12 text-intel-muted animate-pulse mx-auto mb-2" />
              <p className="text-sm text-intel-muted">Cargando datos del mapa...</p>
            </div>
          </div>
        ) : countriesError || clustersError || articlesError ? (
          <div className="h-full w-full flex items-center justify-center bg-intel-surface">
            <div className="text-center text-red-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Error cargando datos</p>
              <p className="text-xs text-gray-500 mt-1">
                {countriesError?.message || clustersError?.message || articlesError?.message}
              </p>
            </div>
          </div>
        ) : !countries || countries.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-intel-surface">
            <div className="text-center text-intel-muted">
              <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay datos de países disponibles</p>
              <p className="text-xs mt-1">Ejecuta las migraciones de la base de datos</p>
            </div>
          </div>
        ) : (
          <GeopoliticalMapComponent
            clusters={filteredClusters || []}
            articles={articles || []}
            marketSymbols={marketSymbols || []}
            countries={countries || []}
            layers={layers}
            onCountryClick={setSelectedCountry}
            onClusterClick={(id) => {
              window.open(`/clusters/${id}`, '_blank')
            }}
            onArticleClick={(id: string) => {
              window.open(`/articles?article=${id}`, '_blank')
            }}
            onSymbolClick={(id: string) => {
              window.open(`/markets/symbol/${id}`, '_blank')
            }}
            selectedCountry={selectedCountry}
            style={mapStyle}
            showAlliances={layers.find(l => l.id === 'alliances')?.visible || false}
          />
        )}
      </div>

      {/* Side panel with integrated country intel */}
      <CountrySidebar
        selectedCountry={selectedCountry}
        selectedCountryData={selectedCountryData || null}
        clusters={filteredClusters || []}
        articles={articles || []}
        marketSymbolsCount={marketSymbols?.filter((m) => m.country === selectedCountry).length || 0}
        onClose={() => setSelectedCountry(null)}
        clustersLoading={clustersLoading}
        clustersError={clustersError as Error | null}
      />
    </div>
  )
}
