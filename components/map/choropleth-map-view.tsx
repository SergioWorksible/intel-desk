'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Database } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'
import { format } from 'date-fns'
import { countryCoordinates } from '@/lib/map/country-coordinates'

type Cluster = Database['public']['Tables']['clusters']['Row']
type Article = Database['public']['Tables']['articles']['Row']
type MarketSymbol = Database['public']['Tables']['market_symbols']['Row']
type Country = Database['public']['Tables']['countries']['Row']
type MarketQuote = Database['public']['Tables']['market_quotes']['Row']

interface MapLayer {
  id: string
  name: string
  visible: boolean
  type: 'clusters' | 'articles' | 'markets'
}

interface ChoroplethMapViewProps {
  clusters: Cluster[]
  articles: Article[]
  marketSymbols: (MarketSymbol & { quote?: MarketQuote })[]
  countries: Country[]
  layers: MapLayer[]
  onCountryClick: (code: string | null) => void
  onClusterClick?: (clusterId: string) => void
  onArticleClick?: (articleId: string) => void
  onSymbolClick?: (symbolId: string) => void
  selectedCountry: string | null
  style: 'dark' | 'satellite'
  showAlliances?: boolean
}

export default function ChoroplethMapView({
  clusters,
  articles,
  marketSymbols,
  countries,
  layers,
  onCountryClick,
  selectedCountry,
  style,
  showAlliances = false,
}: ChoroplethMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Map styles
  const styles = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  }

  // Define geopolitical alliances
  const geopoliticalAlliances = useMemo(() => ({
    nato: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'CA', 'TR', 'PL', 'NL', 'BE', 'NO', 'DK', 'PT', 'LU', 'IS', 'EE', 'LV', 'LT'],
    eu: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'LU', 'AT', 'SE', 'DK', 'FI', 'PT', 'IE', 'GR', 'SI', 'MT', 'CY', 'EE', 'LV', 'LT', 'CZ', 'SK', 'HU', 'PL', 'HR', 'RO', 'BG'],
    brics: ['BR', 'RU', 'IN', 'CN', 'ZA', 'IR', 'EG', 'ET', 'UA'],
    sco: ['RU', 'CN', 'KZ', 'KG', 'TJ', 'UZ', 'IN', 'PK', 'IR'],
    asean: ['ID', 'MY', 'SG', 'TH', 'VN', 'PH', 'MM', 'KH', 'LA', 'BN', 'TL']
  }), [])

  // Calculate alliance lines between countries
  const allianceLines = useMemo(() => {
    const lines: Array<{
      from: string
      to: string
      alliance: string
      type: 'alliance'
    }> = []

    // Process each alliance
    Object.entries(geopoliticalAlliances).forEach(([allianceName, members]) => {
      // Create connections between alliance members (limited to avoid clutter)
      for (let i = 0; i < Math.min(members.length, 8); i++) {
        for (let j = i + 1; j < Math.min(members.length, 8); j++) {
          const fromCountry = members[i]
          const toCountry = members[j]

          // Only add if countries exist in the countries array
          if (countries.some(c => c.code === fromCountry) && countries.some(c => c.code === toCountry)) {
            lines.push({
              from: fromCountry,
              to: toCountry,
              alliance: allianceName.toUpperCase(),
              type: 'alliance'
            })
          }
        }
      }
    })

    return lines
  }, [geopoliticalAlliances, countries])

  // Calculate conflict lines between countries
  const conflictLines = useMemo(() => {
    const lines: Array<{
      from: string
      to: string
      intensity: number
      type: 'conflict' | 'tension' | 'alliance'
    }> = []

    // Find countries involved in the same clusters (potential conflicts)
    clusters.forEach((cluster) => {
      if (cluster.countries.length > 1) {
        // Create connections between countries in the same cluster
        for (let i = 0; i < cluster.countries.length; i++) {
          for (let j = i + 1; j < cluster.countries.length; j++) {
            const fromCountry = cluster.countries[i]
            const toCountry = cluster.countries[j]

            // Check if this connection already exists
            const existingLine = lines.find(
              line => (line.from === fromCountry && line.to === toCountry) ||
                     (line.from === toCountry && line.to === fromCountry)
            )

            if (existingLine) {
              existingLine.intensity = Math.max(existingLine.intensity, cluster.severity)
            } else {
              lines.push({
                from: fromCountry,
                to: toCountry,
                intensity: cluster.severity,
                type: cluster.severity > 60 ? 'conflict' : 'tension'
              })
            }
          }
        }
      }
    })

    return lines
  }, [clusters])

  // Calculate country data scores with enhanced geopolitical metrics
  const countryData = useMemo(() => {
    const data: Record<
      string,
      {
        clusterCount: number
        maxSeverity: number
        articleCount: number
        marketCount: number
        hasData: boolean
        geopoliticalRisk: number
        conflictIntensity: number
        stabilityScore: number
        watchlistStatus: boolean
        regionTension: number
      }
    > = {}

    // Initialize with base data
    countries.forEach((country) => {
      data[country.code] = {
        clusterCount: 0,
        maxSeverity: 0,
        articleCount: 0,
        marketCount: 0,
        hasData: false,
        geopoliticalRisk: 0,
        conflictIntensity: 0,
        stabilityScore: 100,
        watchlistStatus: country.watchlist || false,
        regionTension: 0,
      }
    })

    // Process clusters with enhanced scoring
    if (layers.find((l) => l.id === 'clusters' && l.visible)) {
      clusters.forEach((cluster) => {
        cluster.countries.forEach((country) => {
          if (!data[country]) {
            data[country] = {
              clusterCount: 0,
              maxSeverity: 0,
              articleCount: 0,
              marketCount: 0,
              hasData: false,
              geopoliticalRisk: 0,
              conflictIntensity: 0,
              stabilityScore: 100,
              watchlistStatus: false,
              regionTension: 0,
            }
          }
          data[country].clusterCount++
          data[country].maxSeverity = Math.max(data[country].maxSeverity, cluster.severity)
          data[country].hasData = true

          // Calculate geopolitical risk based on severity and recency
          const daysOld = (Date.now() - new Date(cluster.updated_at).getTime()) / (1000 * 60 * 60 * 24)
          const recencyFactor = Math.max(0, 1 - daysOld / 30) // Events older than 30 days have reduced impact
          data[country].geopoliticalRisk = Math.max(data[country].geopoliticalRisk, cluster.severity * recencyFactor)

          // Conflict intensity for countries with multiple countries involved
          if (cluster.countries.length > 1) {
            data[country].conflictIntensity += cluster.severity / cluster.countries.length
          }
        })
      })
    }

    // Process articles for activity level
    if (layers.find((l) => l.id === 'articles' && l.visible)) {
      articles.forEach((article) => {
        article.countries.forEach((country) => {
          if (!data[country]) {
            data[country] = {
              clusterCount: 0,
              maxSeverity: 0,
              articleCount: 0,
              marketCount: 0,
              hasData: false,
              geopoliticalRisk: 0,
              conflictIntensity: 0,
              stabilityScore: 100,
              watchlistStatus: false,
              regionTension: 0,
            }
          }
          data[country].articleCount++
          data[country].hasData = true
        })
      })
    }

    // Process markets and calculate stability indicators
    if (layers.find((l) => l.id === 'markets' && l.visible)) {
      marketSymbols.forEach((symbol) => {
        if (symbol.country && symbol.quote) {
          if (!data[symbol.country]) {
            data[symbol.country] = {
              clusterCount: 0,
              maxSeverity: 0,
              articleCount: 0,
              marketCount: 0,
              hasData: false,
              geopoliticalRisk: 0,
              conflictIntensity: 0,
              stabilityScore: 100,
              watchlistStatus: false,
              regionTension: 0,
            }
          }
          data[symbol.country].marketCount++
          data[symbol.country].hasData = true

          // Market volatility affects stability score
          const volatility = Math.abs(symbol.quote.change_percent || 0)
          data[symbol.country].stabilityScore = Math.max(0, data[symbol.country].stabilityScore - volatility * 10)
        }
      })
    }

    // Calculate regional tension for countries in conflict-prone regions
    const highRiskRegions = ['Eastern Europe', 'Middle East', 'South China Sea', 'Korean Peninsula']
    Object.keys(data).forEach((countryCode) => {
      const country = countries.find(c => c.code === countryCode)
      if (country && highRiskRegions.some(region => country.subregion?.includes(region) || country.region === region)) {
        data[countryCode].regionTension = 30 + (data[countryCode].clusterCount * 10)
      }
    })

    return data
  }, [clusters, articles, marketSymbols, layers, countries])

  // Enhanced geopolitical color system
  const getCountryColor = (countryCode: string): string => {
    const data = countryData[countryCode]
    if (!data) return 'rgba(100, 100, 100, 0.1)'

    const clustersVisible = layers.find((l) => l.id === 'clusters' && l.visible)
    const articlesVisible = layers.find((l) => l.id === 'articles' && l.visible)
    const marketsVisible = layers.find((l) => l.id === 'markets' && l.visible)

    // Geopolitical risk visualization mode (default)
    if (!clustersVisible && !articlesVisible && !marketsVisible) {
      const riskScore = data.geopoliticalRisk + data.regionTension
      const stability = data.stabilityScore

      // High geopolitical risk countries
      if (riskScore > 60) {
        const intensity = Math.min((riskScore - 60) / 40, 1)
        return `rgba(220, 38, 38, ${0.4 + intensity * 0.6})` // Deep red for crisis zones
      }
      // Medium risk with low stability
      if (riskScore > 30 || stability < 70) {
        const intensity = Math.min(riskScore / 60 + (100 - stability) / 100, 1)
        return `rgba(217, 119, 6, ${0.3 + intensity * 0.5})` // Orange for tension zones
      }
      // Watchlist countries
      if (data.watchlistStatus) {
        return 'rgba(245, 158, 11, 0.5)' // Amber for monitored countries
      }
      // Low activity but stable
      if (data.hasData) {
        return 'rgba(34, 197, 94, 0.3)' // Light green for stable but active
      }
      // No significant activity
      return 'rgba(100, 100, 100, 0.05)'
    }

    // Legacy layer-based coloring for when specific layers are active
    if (clustersVisible && data.clusterCount > 0) {
      // Enhanced severity coloring with conflict intensity
      const baseSeverity = data.maxSeverity
      const conflictBonus = data.conflictIntensity * 0.2
      const totalSeverity = Math.min(baseSeverity + conflictBonus, 100)

      if (totalSeverity >= 80) return 'rgba(220, 38, 38, 0.8)' // Crisis red
      if (totalSeverity >= 60) return 'rgba(239, 68, 68, 0.7)' // High risk red
      if (totalSeverity >= 40) return 'rgba(217, 119, 6, 0.7)' // Tension orange
      if (totalSeverity >= 20) return 'rgba(251, 191, 36, 0.6)' // Warning yellow
      return 'rgba(34, 197, 94, 0.5)' // Low concern green
    }

    if (articlesVisible && data.articleCount > 0) {
      // Media attention intensity
      const intensity = Math.min(data.articleCount / 30, 1)
      if (intensity > 0.7) return `rgba(59, 130, 246, ${0.5 + intensity * 0.3})` // Intense blue
      return `rgba(96, 165, 250, ${0.3 + intensity * 0.4})` // Standard blue
    }

    if (marketsVisible && data.marketCount > 0) {
      // Market stability coloring
      const volatility = Math.max(0, 100 - data.stabilityScore)
      if (volatility > 50) return 'rgba(168, 85, 247, 0.7)' // Volatile purple
      if (volatility > 25) return 'rgba(147, 51, 234, 0.5)' // Moderate purple
      return 'rgba(196, 181, 253, 0.4)' // Stable light purple
    }

    // Default for countries with some data but no active layers
    if (data.hasData) {
      return 'rgba(156, 163, 175, 0.2)' // Light gray for minimal activity
    }

    return 'rgba(100, 100, 100, 0.05)' // Very light for no activity
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styles[style],
      center: [0, 20],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    // Set default cursor
    map.current.getCanvas().style.cursor = 'grab'

    // Handle cursor changes during drag
    map.current.on('mousedown', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'grabbing'
      }
    })

    map.current.on('mouseup', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'grab'
      }
    })

    map.current.on('load', () => {
      if (!map.current) return

      // Add countries GeoJSON source
      map.current.addSource('countries', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
      })

      // Add fill layer for countries
      map.current.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': 'rgba(100, 100, 100, 0.1)',
          'fill-opacity': 1,
        },
      })

      // Add outline layer for countries
      map.current.addLayer({
        id: 'countries-outline',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.2)',
          'line-width': 1,
        },
      })

      // Add hover effect
      map.current.addLayer({
        id: 'countries-hover',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.8)',
          'line-width': 2,
        },
        filter: ['==', 'ISO_A2', ''],
      })

      // Add selected effect
      map.current.addLayer({
        id: 'countries-selected',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#6366f1',
          'line-width': 3,
        },
        filter: ['==', 'ISO_A2', ''],
      })

      // Add alliance lines source
      map.current.addSource('alliance-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })

      // Add alliance lines layer
      map.current.addLayer({
        id: 'alliance-lines',
        type: 'line',
        source: 'alliance-lines',
        paint: {
          'line-color': [
            'match',
            ['get', 'alliance'],
            'NATO', 'rgba(59, 130, 246, 0.4)',
            'EU', 'rgba(34, 197, 94, 0.4)',
            'BRICS', 'rgba(168, 85, 247, 0.4)',
            'SCO', 'rgba(236, 72, 153, 0.4)',
            'ASEAN', 'rgba(245, 158, 11, 0.4)',
            'rgba(156, 163, 175, 0.3)'
          ],
          'line-width': 1,
          'line-opacity': 0.6
        }
      })

      // Add conflict lines source
      map.current.addSource('conflict-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })

      // Add conflict lines layer
      map.current.addLayer({
        id: 'conflict-lines',
        type: 'line',
        source: 'conflict-lines',
        paint: {
          'line-color': [
            'match',
            ['get', 'type'],
            'conflict', 'rgba(220, 38, 38, 0.8)',
            'tension', 'rgba(217, 119, 6, 0.6)',
            'alliance', 'rgba(34, 197, 94, 0.5)',
            'rgba(156, 163, 175, 0.4)'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'intensity'],
            0, 1,
            50, 2,
            100, 4
          ],
          'line-dasharray': [
            'match',
            ['get', 'type'],
            'conflict', ['literal', [2, 1]],
            'tension', ['literal', [4, 2]],
            'alliance', ['literal', [1, 0]],
            ['literal', [1, 0]]
          ]
        }
      })

      // Add geopolitical hotspots source
      map.current.addSource('geopolitical-hotspots', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })

      // Add hotspots circles layer
      map.current.addLayer({
        id: 'hotspots-circles',
        type: 'circle',
        source: 'geopolitical-hotspots',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'riskLevel'],
            0, 8,
            50, 12,
            100, 20
          ],
          'circle-color': [
            'match',
            ['get', 'riskType'],
            'crisis', 'rgba(220, 38, 38, 0.6)',
            'high-risk', 'rgba(239, 68, 68, 0.5)',
            'tension', 'rgba(217, 119, 6, 0.5)',
            'watchlist', 'rgba(245, 158, 11, 0.4)',
            'rgba(156, 163, 175, 0.3)'
          ],
          'circle-stroke-color': [
            'match',
            ['get', 'riskType'],
            'crisis', '#dc2626',
            'high-risk', '#ef4444',
            'tension', '#d97706',
            'watchlist', '#f59e0b',
            '#6b7280'
          ],
          'circle-stroke-width': 2,
          'circle-opacity': 0.7
        }
      })

      // Add hotspot labels
      map.current.addLayer({
        id: 'hotspots-labels',
        type: 'symbol',
        source: 'geopolitical-hotspots',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-anchor': 'bottom',
          'text-justify': 'center',
          'text-offset': [0, -1.5],
          'text-font': ['Open Sans Regular']
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        },
        minzoom: 3
      })

      // Click handler
      map.current.on('click', 'countries-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const countryCode = e.features[0].properties?.ISO_A2
          if (countryCode) {
            onCountryClick(countryCode)
          }
        }
      })

      // Hover handlers
      let hoveredCountryId: string | null = null

      map.current.on('mousemove', 'countries-fill', (e) => {
        if (!map.current) return
        map.current.getCanvas().style.cursor = 'pointer'

        if (e.features && e.features.length > 0) {
          const countryCode = e.features[0].properties?.ISO_A2
          
          if (hoveredCountryId !== countryCode) {
            hoveredCountryId = countryCode
            map.current.setFilter('countries-hover', ['==', 'ISO_A2', countryCode || ''])

            // Show popup
            if (countryCode && countryData[countryCode]?.hasData) {
              const data = countryData[countryCode]
              const countryName = e.features[0].properties?.ADMIN || countryCode

              const riskColor = data.geopoliticalRisk > 60 ? '#dc2626' : data.geopoliticalRisk > 30 ? '#d97706' : '#16a34a'
              const stabilityColor = data.stabilityScore < 70 ? '#dc2626' : data.stabilityScore < 85 ? '#d97706' : '#16a34a'

              const popupContent = `
                <div style="font-family: monospace; font-size: 12px; color: #e5e7eb; min-width: 180px;">
                  <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: white;">
                    ${countryName}
                    ${data.watchlistStatus ? ' <span style="color: #f59e0b;">⚠️</span>' : ''}
                  </div>

                  <!-- Geopolitical Risk -->
                  <div style="margin-bottom: 4px;">
                    <span style="color: #9ca3af;">🌍 Riesgo geopolítico:</span>
                    <span style="color: ${riskColor}; font-weight: bold; margin-left: 4px;">
                      ${Math.round(data.geopoliticalRisk)}%
                    </span>
                  </div>

                  <!-- Stability Score -->
                  ${data.marketCount > 0 ? `
                    <div style="margin-bottom: 4px;">
                      <span style="color: #9ca3af;">📊 Estabilidad:</span>
                      <span style="color: ${stabilityColor}; font-weight: bold; margin-left: 4px;">
                        ${Math.round(data.stabilityScore)}%
                      </span>
                    </div>
                  ` : ''}

                  <!-- Conflict Intensity -->
                  ${data.conflictIntensity > 0 ? `
                    <div style="margin-bottom: 4px;">
                      <span style="color: #9ca3af;">⚔️ Intensidad conflicto:</span>
                      <span style="color: ${data.conflictIntensity > 50 ? '#dc2626' : '#d97706'}; font-weight: bold; margin-left: 4px;">
                        ${Math.round(data.conflictIntensity)}
                      </span>
                    </div>
                  ` : ''}

                  <!-- Regional Tension -->
                  ${data.regionTension > 0 ? `
                    <div style="margin-bottom: 4px;">
                      <span style="color: #9ca3af;">🏛️ Tensión regional:</span>
                      <span style="color: #d97706; font-weight: bold; margin-left: 4px;">
                        +${Math.round(data.regionTension)}
                      </span>
                    </div>
                  ` : ''}

                  <div style="border-top: 1px solid #374151; margin: 6px 0;"></div>

                  <!-- Activity Summary -->
                  ${data.clusterCount > 0 ? `
                    <div style="color: #9ca3af; margin-bottom: 2px;">
                      🔴 ${data.clusterCount} cluster(s) de eventos
                    </div>
                  ` : ''}
                  ${data.articleCount > 0 ? `
                    <div style="color: #9ca3af; margin-bottom: 2px;">
                      📰 ${data.articleCount} artículo(s)
                    </div>
                  ` : ''}
                  ${data.marketCount > 0 ? `
                    <div style="color: #9ca3af; margin-bottom: 2px;">
                      📈 ${data.marketCount} símbolo(s) de mercado
                    </div>
                  ` : ''}

                  <div style="color: #6b6b6b; margin-top: 6px; font-size: 10px;">
                    Click para ver detalles completos
                  </div>
                </div>
              `

              new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
              })
                .setLngLat(e.lngLat)
                .setHTML(popupContent)
                .addTo(map.current!)
            }
          }
        }
      })

      map.current.on('mouseleave', 'countries-fill', () => {
        if (!map.current) return
        map.current.getCanvas().style.cursor = ''
        hoveredCountryId = null
        map.current.setFilter('countries-hover', ['==', 'ISO_A2', ''])
        
        // Remove all popups
        const popups = document.getElementsByClassName('maplibregl-popup')
        while (popups[0]) {
          popups[0].remove()
        }
      })

      setMapLoaded(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update style when changed
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.setStyle(styles[style])

      // Re-add layers after style change
      map.current.once('styledata', () => {
        if (!map.current) return

        // Set default cursor
        map.current.getCanvas().style.cursor = 'grab'

        // Handle cursor changes during drag
        map.current.on('mousedown', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'grabbing'
          }
        })

        map.current.on('mouseup', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'grab'
          }
        })

        // Remove existing sources and layers to avoid conflicts
        try {
          if (map.current.getLayer('countries-fill')) {
            map.current.removeLayer('countries-fill')
          }
          if (map.current.getLayer('countries-outline')) {
            map.current.removeLayer('countries-outline')
          }
          if (map.current.getLayer('countries-hover')) {
            map.current.removeLayer('countries-hover')
          }
          if (map.current.getLayer('countries-selected')) {
            map.current.removeLayer('countries-selected')
          }
          if (map.current.getSource('countries')) {
            map.current.removeSource('countries')
          }

          if (map.current.getLayer('alliance-lines')) {
            map.current.removeLayer('alliance-lines')
          }
          if (map.current.getSource('alliance-lines')) {
            map.current.removeSource('alliance-lines')
          }

          if (map.current.getLayer('conflict-lines')) {
            map.current.removeLayer('conflict-lines')
          }
          if (map.current.getSource('conflict-lines')) {
            map.current.removeSource('conflict-lines')
          }

          if (map.current.getLayer('hotspots-circles')) {
            map.current.removeLayer('hotspots-circles')
          }
          if (map.current.getLayer('hotspots-labels')) {
            map.current.removeLayer('hotspots-labels')
          }
          if (map.current.getSource('geopolitical-hotspots')) {
            map.current.removeSource('geopolitical-hotspots')
          }
        } catch (error) {
          console.warn('Error removing existing layers:', error)
        }

        // Re-add sources and layers
        map.current.addSource('countries', {
          type: 'geojson',
          data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
        })

        map.current.addLayer({
          id: 'countries-fill',
          type: 'fill',
          source: 'countries',
          paint: {
            'fill-color': 'rgba(100, 100, 100, 0.1)',
            'fill-opacity': 1,
          },
        })

        map.current.addLayer({
          id: 'countries-outline',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.2)',
            'line-width': 1,
          },
        })

        map.current.addLayer({
          id: 'countries-hover',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.8)',
            'line-width': 2,
          },
          filter: ['==', 'ISO_A2', ''],
        })

        map.current.addLayer({
          id: 'countries-selected',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': '#6366f1',
            'line-width': 3,
          },
          filter: ['==', 'ISO_A2', ''],
        })

        // Re-add alliance lines source and layer
        map.current.addSource('alliance-lines', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.current.addLayer({
          id: 'alliance-lines',
          type: 'line',
          source: 'alliance-lines',
          paint: {
            'line-color': [
              'match',
              ['get', 'alliance'],
              'NATO', 'rgba(59, 130, 246, 0.4)',
              'EU', 'rgba(34, 197, 94, 0.4)',
              'BRICS', 'rgba(168, 85, 247, 0.4)',
              'SCO', 'rgba(236, 72, 153, 0.4)',
              'ASEAN', 'rgba(245, 158, 11, 0.4)',
              'rgba(156, 163, 175, 0.3)'
            ],
            'line-width': 1,
            'line-opacity': 0.6
          }
        })

        // Re-add conflict lines source and layer
        map.current.addSource('conflict-lines', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.current.addLayer({
          id: 'conflict-lines',
          type: 'line',
          source: 'conflict-lines',
          paint: {
            'line-color': [
              'match',
              ['get', 'type'],
              'conflict', 'rgba(220, 38, 38, 0.8)',
              'tension', 'rgba(217, 119, 6, 0.6)',
              'alliance', 'rgba(34, 197, 94, 0.5)',
              'rgba(156, 163, 175, 0.4)'
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['get', 'intensity'],
              0, 1,
              50, 2,
              100, 4
            ],
          'line-dasharray': [
            'match',
            ['get', 'type'],
            'conflict', ['literal', [2, 1]],
            'tension', ['literal', [4, 2]],
            'alliance', ['literal', [1, 0]],
            ['literal', [1, 0]]
          ]
          }
        })

        // Re-add geopolitical hotspots source and layers
        map.current.addSource('geopolitical-hotspots', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.current.addLayer({
          id: 'hotspots-circles',
          type: 'circle',
          source: 'geopolitical-hotspots',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'riskLevel'],
              0, 8,
              50, 12,
              100, 20
            ],
            'circle-color': [
              'match',
              ['get', 'riskType'],
              'crisis', 'rgba(220, 38, 38, 0.6)',
              'high-risk', 'rgba(239, 68, 68, 0.5)',
              'tension', 'rgba(217, 119, 6, 0.5)',
              'watchlist', 'rgba(245, 158, 11, 0.4)',
              'rgba(156, 163, 175, 0.3)'
            ],
            'circle-stroke-color': [
              'match',
              ['get', 'riskType'],
              'crisis', '#dc2626',
              'high-risk', '#ef4444',
              'tension', '#d97706',
              'watchlist', '#f59e0b',
              '#6b7280'
            ],
            'circle-stroke-width': 2,
            'circle-opacity': 0.7
          }
        })

        map.current.addLayer({
          id: 'hotspots-labels',
          type: 'symbol',
          source: 'geopolitical-hotspots',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 10,
            'text-anchor': 'bottom',
            'text-justify': 'center',
            'text-offset': [0, -1.5],
            'text-font': ['Open Sans Regular']
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
          },
          minzoom: 3
        })

        // Re-add event handlers
        map.current.on('click', 'countries-fill', (e) => {
          if (e.features && e.features.length > 0) {
            const countryCode = e.features[0].properties?.ISO_A2
            if (countryCode) {
              onCountryClick(countryCode)
            }
          }
        })

        let hoveredCountryId: string | null = null

        map.current.on('mousemove', 'countries-fill', (e) => {
          if (!map.current) return
          map.current.getCanvas().style.cursor = 'pointer'

          if (e.features && e.features.length > 0) {
            const countryCode = e.features[0].properties?.ISO_A2

            if (hoveredCountryId !== countryCode) {
              hoveredCountryId = countryCode
              map.current.setFilter('countries-hover', ['==', 'ISO_A2', countryCode || ''])

              // Show popup
              if (countryCode && countryData[countryCode]?.hasData) {
                const data = countryData[countryCode]
                const countryName = e.features[0].properties?.ADMIN || countryCode

                const riskColor = data.geopoliticalRisk > 60 ? '#dc2626' : data.geopoliticalRisk > 30 ? '#d97706' : '#16a34a'
                const stabilityColor = data.stabilityScore < 70 ? '#dc2626' : data.stabilityScore < 85 ? '#d97706' : '#16a34a'

                const popupContent = `
                  <div style="font-family: monospace; font-size: 12px; color: #e5e7eb; min-width: 180px;">
                    <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: white;">
                      ${countryName}
                      ${data.watchlistStatus ? ' <span style="color: #f59e0b;">⚠️</span>' : ''}
                    </div>

                    <!-- Geopolitical Risk -->
                    <div style="margin-bottom: 4px;">
                      <span style="color: #9ca3af;">🌍 Riesgo geopolítico:</span>
                      <span style="color: ${riskColor}; font-weight: bold; margin-left: 4px;">
                        ${Math.round(data.geopoliticalRisk)}%
                      </span>
                    </div>

                    <!-- Stability Score -->
                    ${data.marketCount > 0 ? `
                      <div style="margin-bottom: 4px;">
                        <span style="color: #9ca3af;">📊 Estabilidad:</span>
                        <span style="color: ${stabilityColor}; font-weight: bold; margin-left: 4px;">
                          ${Math.round(data.stabilityScore)}%
                        </span>
                      </div>
                    ` : ''}

                    <!-- Conflict Intensity -->
                    ${data.conflictIntensity > 0 ? `
                      <div style="margin-bottom: 4px;">
                        <span style="color: #9ca3af;">⚔️ Intensidad conflicto:</span>
                        <span style="color: ${data.conflictIntensity > 50 ? '#dc2626' : '#d97706'}; font-weight: bold; margin-left: 4px;">
                          ${Math.round(data.conflictIntensity)}
                        </span>
                      </div>
                    ` : ''}

                    <!-- Regional Tension -->
                    ${data.regionTension > 0 ? `
                      <div style="margin-bottom: 4px;">
                        <span style="color: #9ca3af;">🏛️ Tensión regional:</span>
                        <span style="color: #d97706; font-weight: bold; margin-left: 4px;">
                          +${Math.round(data.regionTension)}
                        </span>
                      </div>
                    ` : ''}

                    <div style="border-top: 1px solid #374151; margin: 6px 0;"></div>

                    <!-- Activity Summary -->
                    ${data.clusterCount > 0 ? `
                      <div style="color: #9ca3af; margin-bottom: 2px;">
                        🔴 ${data.clusterCount} cluster(s) de eventos
                      </div>
                    ` : ''}
                    ${data.articleCount > 0 ? `
                      <div style="color: #9ca3af; margin-bottom: 2px;">
                        📰 ${data.articleCount} artículo(s)
                      </div>
                    ` : ''}
                    ${data.marketCount > 0 ? `
                      <div style="color: #9ca3af; margin-bottom: 2px;">
                        📈 ${data.marketCount} símbolo(s) de mercado
                      </div>
                    ` : ''}

                    <div style="color: #6b6b6b; margin-top: 6px; font-size: 10px;">
                      Click para ver detalles completos
                    </div>
                  </div>
                `

                new maplibregl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                })
                  .setLngLat(e.lngLat)
                  .setHTML(popupContent)
                  .addTo(map.current!)
              }
            }
          }
        })

        map.current.on('mouseleave', 'countries-fill', () => {
          if (!map.current) return
          map.current.getCanvas().style.cursor = ''
          hoveredCountryId = null
          map.current.setFilter('countries-hover', ['==', 'ISO_A2', ''])

          // Remove all popups
          const popups = document.getElementsByClassName('maplibregl-popup')
          while (popups[0]) {
            popups[0].remove()
          }
        })
      })
    }
  }, [style, mapLoaded])

  // Update country colors when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Ensure the layer exists before trying to update it
    if (!map.current.getLayer('countries-fill')) {
      return
    }

    // Build color expression for MapLibre
    const colorExpression: any[] = ['match', ['get', 'ISO_A2']]

    Object.keys(countryData).forEach((countryCode) => {
      colorExpression.push(countryCode, getCountryColor(countryCode))
    })

    // Default color
    colorExpression.push('rgba(100, 100, 100, 0.1)')

    try {
      map.current.setPaintProperty('countries-fill', 'fill-color', colorExpression)
    } catch (error) {
      console.error('Error updating country colors:', error)
    }
  }, [countryData, layers, mapLoaded])

  // Update alliance lines
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const features = showAlliances ? allianceLines
      .filter((line) => {
        // Only show alliances between countries that have some data or are watchlisted
        const fromHasData = countryData[line.from]?.hasData || countryData[line.from]?.watchlistStatus
        const toHasData = countryData[line.to]?.hasData || countryData[line.to]?.watchlistStatus
        return fromHasData && toHasData
      })
      .map((line) => {
        const fromCoords = countryCoordinates[line.from]
        const toCoords = countryCoordinates[line.to]

        if (!fromCoords || !toCoords) return null

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [fromCoords, toCoords]
          },
          properties: {
            alliance: line.alliance,
            type: line.type,
            from: line.from,
            to: line.to
          }
        }
      }).filter((feature): feature is NonNullable<typeof feature> => feature !== null) : []

    const geoJsonData = {
      type: 'FeatureCollection' as const,
      features: features
    }

    const source = map.current.getSource('alliance-lines') as maplibregl.GeoJSONSource
    if (source) {
      source.setData(geoJsonData)
    }
  }, [allianceLines, countryData, mapLoaded, showAlliances])

  // Update conflict lines
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const features = conflictLines.map((line) => {
      const fromCoords = countryCoordinates[line.from]
      const toCoords = countryCoordinates[line.to]

      if (!fromCoords || !toCoords) return null

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [fromCoords, toCoords]
        },
        properties: {
          type: line.type,
          intensity: line.intensity,
          from: line.from,
          to: line.to
        }
      }
    }).filter((feature): feature is NonNullable<typeof feature> => feature !== null)

    const geoJsonData = {
      type: 'FeatureCollection' as const,
      features: features
    }

    const source = map.current.getSource('conflict-lines') as maplibregl.GeoJSONSource
    if (source) {
      source.setData(geoJsonData)
    }
  }, [conflictLines, mapLoaded])

  // Update geopolitical hotspots
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const hotspotFeatures = Object.entries(countryData)
      .filter(([countryCode, data]) => {
        // Show hotspots for countries with high geopolitical risk or watchlist status
        return data.geopoliticalRisk > 30 ||
               data.watchlistStatus ||
               data.conflictIntensity > 20 ||
               data.regionTension > 20
      })
      .map(([countryCode, data]) => {
        const coords = countryCoordinates[countryCode]
        if (!coords) return null

        const country = countries.find(c => c.code === countryCode)
        const riskLevel = Math.max(data.geopoliticalRisk, data.conflictIntensity, data.regionTension)

        let riskType = 'tension'
        if (data.geopoliticalRisk > 60 || data.conflictIntensity > 50) riskType = 'crisis'
        else if (data.geopoliticalRisk > 40 || data.watchlistStatus) riskType = 'high-risk'
        else if (data.watchlistStatus) riskType = 'watchlist'

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: coords
          },
          properties: {
            riskLevel: Math.min(riskLevel, 100),
            riskType,
            countryCode,
            countryName: country?.name || countryCode,
            label: riskLevel > 50 ? (country?.name || countryCode) : ''
          }
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)

    const hotspotsGeoJson = {
      type: 'FeatureCollection' as const,
      features: hotspotFeatures
    }

    const source = map.current.getSource('geopolitical-hotspots') as maplibregl.GeoJSONSource
    if (source) {
      source.setData(hotspotsGeoJson)
    }
  }, [countryData, countries, mapLoaded])

  // Update selected country
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (selectedCountry) {
      map.current.setFilter('countries-selected', ['==', 'ISO_A2', selectedCountry])

      // Zoom to country (simplified - in production use country bounds)
      map.current.flyTo({
        zoom: 4,
        duration: 1000,
      })
    } else {
      map.current.setFilter('countries-selected', ['==', 'ISO_A2', ''])
    }
  }, [selectedCountry, mapLoaded])

  return (
    <div ref={mapContainer} className="h-full w-full">
      <style jsx global>{`
        .maplibregl-popup-content {
          background: #12121a !important;
          border: 1px solid #1e1e2e !important;
          border-radius: 8px !important;
          padding: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
        }
        .maplibregl-popup-tip {
          border-top-color: #12121a !important;
        }
        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: #12121a !important;
        }
        .maplibregl-popup-anchor-top .maplibregl-popup-tip {
          border-bottom-color: #12121a !important;
        }
      `}</style>
    </div>
  )
}

