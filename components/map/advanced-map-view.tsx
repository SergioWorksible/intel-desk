'use client'

import { useEffect, useRef, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Database } from '@/types/database'
import { countryCoordinates } from '@/lib/map/country-coordinates'
import { formatRelativeTime, getSeverityColor } from '@/lib/utils'
import { format } from 'date-fns'

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

interface AdvancedMapViewProps {
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
}

// Helper to get country coordinates with fallback
function getCountryCoords(countryCode: string): [number, number] | null {
  return countryCoordinates[countryCode] || null
}

// Helper to create marker element
function createMarkerElement(
  type: 'cluster' | 'article' | 'market',
  size: number,
  color: string,
  count?: number
): HTMLDivElement {
  const el = document.createElement('div')
  el.className = `${type}-marker`
  
  // Use CSS classes and stable positioning
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background-color: ${color};
    border: 2px solid rgba(255,255,255,0.4);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: ${size > 20 ? '10px' : '8px'};
    font-weight: bold;
    font-family: monospace;
    box-shadow: 0 0 ${size / 2}px ${color}80, 0 2px 4px rgba(0,0,0,0.3);
    transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
    pointer-events: auto;
    position: relative;
    will-change: transform;
  `
  
  if (count && count > 1) {
    el.textContent = count > 99 ? '99+' : String(count)
  }
  
  // Use more stable hover handling
  let hoverTimeout: NodeJS.Timeout | null = null
  
  el.addEventListener('mouseenter', () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    el.style.transform = 'scale(1.25)'
    el.style.zIndex = '100'
    el.style.boxShadow = `0 0 ${size}px ${color}, 0 4px 8px rgba(0,0,0,0.4)`
  }, { passive: true })
  
  el.addEventListener('mouseleave', () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    hoverTimeout = setTimeout(() => {
      el.style.transform = 'scale(1)'
      el.style.zIndex = '1'
      el.style.boxShadow = `0 0 ${size / 2}px ${color}80, 0 2px 4px rgba(0,0,0,0.3)`
    }, 50)
  }, { passive: true })
  
  return el
}

// Helper to create popup HTML
function createClusterPopup(cluster: Cluster): string {
  const severityColor =
    cluster.severity >= 70 ? '#dc2626' : cluster.severity >= 40 ? '#d97706' : '#16a34a'
  return `
    <div style="font-family: monospace; font-size: 12px; max-width: 300px; color: #e5e7eb;">
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: white;">
        ${cluster.canonical_title}
      </div>
      <div style="margin-bottom: 8px;">
        <span style="color: ${severityColor}; font-weight: bold;">Severity: ${cluster.severity}</span>
        <span style="color: #9ca3af; margin-left: 8px;">Confidence: ${cluster.confidence}%</span>
      </div>
      ${cluster.summary ? `<div style="color: #9ca3af; font-size: 11px; margin-bottom: 6px; line-height: 1.4;">${cluster.summary.slice(0, 150)}${cluster.summary.length > 150 ? '...' : ''}</div>` : ''}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
        <div style="color: #9ca3af; font-size: 10px;">
          <div>Countries: ${cluster.countries.join(', ')}</div>
          <div style="margin-top: 4px;">Articles: ${cluster.article_count} | Sources: ${cluster.source_count}</div>
          <div style="margin-top: 4px;">Updated: ${formatRelativeTime(cluster.updated_at)}</div>
        </div>
      </div>
    </div>
  `
}

function createArticlePopup(article: Article): string {
  return `
    <div style="font-family: monospace; font-size: 12px; max-width: 300px; color: #e5e7eb;">
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: white;">
        ${article.title.slice(0, 80)}${article.title.length > 80 ? '...' : ''}
      </div>
      ${article.snippet ? `<div style="color: #9ca3af; font-size: 11px; margin-bottom: 6px; line-height: 1.4;">${article.snippet.slice(0, 120)}${article.snippet.length > 120 ? '...' : ''}</div>` : ''}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
        <div style="color: #9ca3af; font-size: 10px;">
          <div>Domain: ${article.domain}</div>
          ${article.countries.length > 0 ? `<div style="margin-top: 4px;">Countries: ${article.countries.join(', ')}</div>` : ''}
          ${article.published_at ? `<div style="margin-top: 4px;">Published: ${format(new Date(article.published_at), 'MMM d, yyyy')}</div>` : ''}
        </div>
      </div>
    </div>
  `
}

function createMarketPopup(symbol: MarketSymbol, quote?: MarketQuote): string {
  const changeColor = quote && quote.change_percent >= 0 ? '#16a34a' : '#dc2626'
  return `
    <div style="font-family: monospace; font-size: 12px; max-width: 300px; color: #e5e7eb;">
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: white;">
        ${symbol.symbol} - ${symbol.name}
      </div>
      ${quote ? `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 16px; font-weight: bold; color: white;">
            $${quote.price.toFixed(2)}
          </div>
          <div style="color: ${changeColor}; font-size: 12px; margin-top: 4px;">
            ${quote.change_percent >= 0 ? '+' : ''}${quote.change_percent.toFixed(2)}%
            (${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)})
          </div>
        </div>
      ` : ''}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
        <div style="color: #9ca3af; font-size: 10px;">
          <div>Type: ${symbol.type} | Sector: ${symbol.sector || 'N/A'}</div>
          ${symbol.country ? `<div style="margin-top: 4px;">Country: ${symbol.country}</div>` : ''}
          ${symbol.exchange ? `<div style="margin-top: 4px;">Exchange: ${symbol.exchange}</div>` : ''}
        </div>
      </div>
    </div>
  `
}

export default function AdvancedMapView({
  clusters,
  articles,
  marketSymbols,
  countries,
  layers,
  onCountryClick,
  onClusterClick,
  onArticleClick,
  onSymbolClick,
  selectedCountry,
  style,
}: AdvancedMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupsRef = useRef<maplibregl.Popup[]>([])

  // Map styles
  const styles = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
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
      maxZoom: 12,
      renderWorldCopies: false,
      pitchWithRotate: false,
      dragRotate: false,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    
    // Optimize marker rendering
    map.current.on('moveend', () => {
      // Markers will stay in place, no need to update on move
    })

    // Click handler for countries
    map.current.on('click', (e) => {
      const point = e.lngLat
      let closestCountry: string | null = null
      let closestDistance = Infinity

      Object.entries(countryCoordinates).forEach(([code, coords]) => {
        const distance = Math.sqrt(
          Math.pow(point.lng - coords[0], 2) + Math.pow(point.lat - coords[1], 2)
        )
        // Adjust threshold based on zoom level
        const threshold = map.current ? 20 / Math.pow(map.current.getZoom(), 1.5) : 10
        if (distance < closestDistance && distance < threshold) {
          closestDistance = distance
          closestCountry = code
        }
      })

      if (closestCountry) {
        onCountryClick(closestCountry)
      }
    })

    return () => {
      popupsRef.current.forEach((popup) => popup.remove())
      markersRef.current.forEach((marker) => marker.remove())
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update style when changed
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(styles[style])
    }
  }, [style])

  // Group data by country for efficient rendering
  const dataByCountry = useMemo(() => {
    const grouped: Record<
      string,
      {
        clusters: Cluster[]
        articles: Article[]
        markets: (MarketSymbol & { quote?: MarketQuote })[]
      }
    > = {}

    // Group clusters
    if (layers.find((l) => l.id === 'clusters' && l.visible)) {
      clusters.forEach((cluster) => {
        cluster.countries.forEach((country) => {
          if (!grouped[country]) {
            grouped[country] = { clusters: [], articles: [], markets: [] }
          }
          if (!grouped[country].clusters.find((c) => c.id === cluster.id)) {
            grouped[country].clusters.push(cluster)
          }
        })
      })
    }

    // Group articles
    if (layers.find((l) => l.id === 'articles' && l.visible)) {
      articles.forEach((article) => {
        article.countries.forEach((country) => {
          if (!grouped[country]) {
            grouped[country] = { clusters: [], articles: [], markets: [] }
          }
          grouped[country].articles.push(article)
        })
      })
    }

    // Group market symbols
    if (layers.find((l) => l.id === 'markets' && l.visible)) {
      marketSymbols.forEach((symbol) => {
        if (symbol.country) {
          if (!grouped[symbol.country]) {
            grouped[symbol.country] = { clusters: [], articles: [], markets: [] }
          }
          grouped[symbol.country].markets.push(symbol)
        }
      })
    }

    return grouped
  }, [clusters, articles, marketSymbols, layers])

  // Update markers with better performance
  useEffect(() => {
    if (!map.current) return

    // Wait for map to be ready
    const updateMarkers = () => {
      // Remove existing markers and popups
      popupsRef.current.forEach((popup) => popup.remove())
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      popupsRef.current = []

    // Process each country
    Object.entries(dataByCountry).forEach(([countryCode, data]) => {
      const coords = getCountryCoords(countryCode)
      if (!coords) return

      const hasClusters = data.clusters.length > 0
      const hasArticles = data.articles.length > 0
      const hasMarkets = data.markets.length > 0

      // Create cluster markers
      if (hasClusters && layers.find((l) => l.id === 'clusters' && l.visible)) {
        const maxSeverity = Math.max(...data.clusters.map((c) => c.severity))
        const color =
          maxSeverity >= 70 ? '#dc2626' : maxSeverity >= 40 ? '#d97706' : '#16a34a'
        const size = Math.min(30 + data.clusters.length * 2, 50)

        const el = createMarkerElement('cluster', size, color, data.clusters.length)
        el.onclick = (e) => {
          e.stopPropagation()
          if (data.clusters.length === 1 && onClusterClick) {
            onClusterClick(data.clusters[0].id)
          } else {
            onCountryClick(countryCode)
          }
        }

        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: true,
          className: 'intel-popup',
        }).setHTML(createClusterPopup(data.clusters[0]))

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([coords[0] - 0.2, coords[1] + 0.15]) // Smaller, more stable offset
          .setPopup(popup)
          .addTo(map.current!)

        markersRef.current.push(marker)
        popupsRef.current.push(popup)
      }

      // Create article markers
      if (hasArticles && layers.find((l) => l.id === 'articles' && l.visible)) {
        const recentArticles = data.articles
          .sort((a, b) => {
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0
            return dateB - dateA
          })
          .slice(0, 1) // Show most recent

        recentArticles.forEach((article) => {
          const el = createMarkerElement('article', 16, '#3b82f6', data.articles.length)
          el.onclick = (e) => {
            e.stopPropagation()
            if (onArticleClick) {
              onArticleClick(article.id)
            } else {
              onCountryClick(countryCode)
            }
          }

          const popup = new maplibregl.Popup({
            offset: 15,
            closeButton: true,
            className: 'intel-popup',
          }).setHTML(createArticlePopup(article))

          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat([coords[0] + 0.2, coords[1] - 0.15]) // Smaller, more stable offset
            .setPopup(popup)
            .addTo(map.current!)

          markersRef.current.push(marker)
          popupsRef.current.push(popup)
        })
      }

      // Create market markers
      if (hasMarkets && layers.find((l) => l.id === 'markets' && l.visible)) {
        const activeMarkets = data.markets.filter((m) => m.is_active).slice(0, 5) // Limit to 5

        activeMarkets.forEach((symbol, index) => {
          const changeColor =
            symbol.quote && symbol.quote.change_percent >= 0 ? '#16a34a' : '#dc2626'
          const el = createMarkerElement('market', 14, changeColor)
          el.onclick = (e) => {
            e.stopPropagation()
            if (onSymbolClick) {
              onSymbolClick(symbol.id)
            } else {
              onCountryClick(countryCode)
            }
          }

          const popup = new maplibregl.Popup({
            offset: 15,
            closeButton: true,
            className: 'intel-popup',
          }).setHTML(createMarketPopup(symbol, symbol.quote))

          // Distribute markers around country center with stable positioning
          const angle = (index * (2 * Math.PI)) / activeMarkets.length
          const radius = 0.12 // Smaller radius for better stability
          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat([
              coords[0] + Math.cos(angle) * radius,
              coords[1] + Math.sin(angle) * radius,
            ])
            .setPopup(popup)
            .addTo(map.current!)

          markersRef.current.push(marker)
          popupsRef.current.push(popup)
        })
      }

      // Add watchlist country markers (without data)
      if (
        !hasClusters &&
        !hasArticles &&
        !hasMarkets &&
        countries.find((c) => c.code === countryCode && c.watchlist)
      ) {
        const el = createMarkerElement('cluster', 10, '#6366f6')
        el.style.opacity = '0.5'
        el.onclick = (e) => {
          e.stopPropagation()
          onCountryClick(countryCode)
        }

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat(coords)
          .addTo(map.current!)

        markersRef.current.push(marker)
      }
    })
    }

    if (!map.current.loaded()) {
      map.current.once('load', updateMarkers)
    } else {
      updateMarkers()
    }
  }, [dataByCountry, countries, layers, onCountryClick, onClusterClick, onArticleClick, onSymbolClick])

  // Fly to selected country
  useEffect(() => {
    if (map.current && selectedCountry) {
      const coords = getCountryCoords(selectedCountry)
      if (coords) {
        map.current.flyTo({
          center: coords,
          zoom: 5,
          duration: 1500,
        })
      }
    }
  }, [selectedCountry])

  return (
    <div ref={mapContainer} className="h-full w-full">
      <style jsx global>{`
        .maplibregl-popup-content {
          background: #12121a !important;
          border: 1px solid #1e1e2e !important;
          border-radius: 8px !important;
          padding: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
          max-width: 320px !important;
        }
        .maplibregl-popup-tip {
          border-top-color: #12121a !important;
        }
        .maplibregl-popup-close-button {
          color: #9ca3af !important;
          font-size: 18px !important;
        }
        .maplibregl-popup-close-button:hover {
          color: white !important;
        }
      `}</style>
    </div>
  )
}

