'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Database } from '@/types/database'
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

interface MapboxGlobeViewProps {
  clusters: Cluster[]
  articles: Article[]
  marketSymbols: (MarketSymbol & { quote?: MarketQuote })[]
  countries: Country[]
  layers: MapLayer[]
  onCountryClick: (code: string | null) => void
  onClusterClick?: (clusterId: string) => void
  onArticleClick?: (id: string) => void
  onSymbolClick?: (id: string) => void
  selectedCountry: string | null
  style: 'dark' | 'satellite'
  showAlliances?: boolean
}

// Mapbox token - use NEXT_PUBLIC_MAPBOX_TOKEN from environment (public token, safe for browser)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// Known conflict zones coordinates
const knownConflictZones: Record<string, [number, number]> = {
  'Donbas': [38.0, 48.0],
  'Gaza': [34.5, 31.4],
  'West Bank': [35.2, 31.9],
  'Kashmir': [74.8, 34.1],
  'Crimea': [33.5, 45.0],
  'Eastern Ukraine': [38.0, 48.0],
  'Syria': [38.5, 35.0],
  'Yemen': [44.2, 15.4],
  'Libya': [17.0, 27.0],
  'Mali': [-3.0, 17.0],
  'Donbass': [38.0, 48.0],
  'Donetsk': [37.8, 48.0],
  'Luhansk': [39.3, 48.6],
}

// Función para generar HTML del popup con estilo dark mode
function generatePopupHTML(loc: {
  id: string
  name: string
  coordinates: [number, number]
  significance: 'primary' | 'secondary' | 'tertiary'
  clusterId: string
  clusterTitle: string
  severity: number
  type: 'location' | 'conflict_zone'
  clusterData?: {
    countries: string[]
    topics: string[]
    articleCount: number
    marketImpact?: { direction: string; magnitude: string }
    summary?: string
    entities?: { organizations?: string[]; people?: string[] }
  }
}, countriesMap: Record<string, string>): string {
  const severityClass = loc.severity > 60 ? 'high' : loc.severity > 40 ? 'medium' : 'low'
  const severityLabel = loc.severity > 60 ? 'CRÍTICA' : loc.severity > 40 ? 'MEDIA' : 'BAJA'
  const typeIcon = loc.type === 'conflict_zone' ? '⚔️' : '📍'
  const typeLabel = loc.type === 'conflict_zone' ? 'ZONA DE CONFLICTO' : 'UBICACIÓN'
  
  // Países involucrados
  const countriesHTML = loc.clusterData?.countries?.length 
    ? loc.clusterData.countries.slice(0, 5).map(code => countriesMap[code] || code).join(', ')
    : ''
  
  // Topics
  const topicsHTML = loc.clusterData?.topics?.length
    ? loc.clusterData.topics.slice(0, 3).map(t => `<span class="popup-tag">${t}</span>`).join('')
    : ''
  
  // Market impact
  const marketImpact = loc.clusterData?.marketImpact
  const impactIcon = marketImpact?.direction === 'bearish' ? '📉' : marketImpact?.direction === 'bullish' ? '📈' : '➡️'
  const impactLabel = marketImpact?.magnitude === 'high' ? 'Alto' : marketImpact?.magnitude === 'medium' ? 'Medio' : 'Bajo'
  
  // Entidades
  const orgs = loc.clusterData?.entities?.organizations?.slice(0, 3) || []
  const people = loc.clusterData?.entities?.people?.slice(0, 3) || []

  return `
    <div class="popup-container-compact">
      <div class="popup-header-compact">
        <div class="popup-type-badge-compact ${loc.type}">${typeIcon}</div>
        <div>
          <div class="popup-location-name-compact">${loc.name}</div>
          <div class="popup-severity-compact ${severityClass}">${severityLabel} • ${loc.severity}</div>
        </div>
      </div>
      
      <div class="popup-stats-compact">
        <span>📰 ${loc.clusterData?.articleCount || 0}</span>
        ${marketImpact ? `<span>${impactIcon} ${impactLabel}</span>` : ''}
      </div>
      
      ${countriesHTML ? `
        <div class="popup-section-compact">
          <span class="popup-label-compact">Países:</span>
          <span class="popup-countries-compact">${countriesHTML}</span>
        </div>
      ` : ''}
      
      ${topicsHTML ? `
        <div class="popup-tags-compact">${topicsHTML}</div>
      ` : ''}
      
      <button class="popup-action-btn-compact" onclick="window.open('/clusters/${loc.clusterId}', '_blank')">
        Ver detalles →
      </button>
    </div>
  `
}

export default function MapboxGlobeView({
  clusters,
  articles,
  marketSymbols,
  countries,
  layers,
  onCountryClick,
  onClusterClick,
  selectedCountry,
  style,
  showAlliances = false,
}: MapboxGlobeViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Mapa de códigos de países a nombres
  const countriesMap = useMemo(() => {
    const m: Record<string, string> = {}
    countries.forEach(c => { m[c.code] = c.name })
    return m
  }, [countries])

  // Calcular riesgo por país basado en clusters
  const countryRiskData = useMemo(() => {
    const riskMap: Record<string, {
      maxSeverity: number
      clusterCount: number
      conflictBorders: string[]
      clusters: Cluster[]
    }> = {}
    
    clusters.forEach(cluster => {
      cluster.countries.forEach(code => {
        if (!riskMap[code]) {
          riskMap[code] = {
            maxSeverity: 0,
            clusterCount: 0,
            conflictBorders: [],
            clusters: []
          }
        }
        riskMap[code].maxSeverity = Math.max(riskMap[code].maxSeverity, cluster.severity)
        riskMap[code].clusterCount++
        riskMap[code].clusters.push(cluster)
        
        // Detectar fronteras de conflicto (países vecinos con conflictos)
        cluster.countries.forEach(otherCode => {
          if (otherCode !== code && !riskMap[code].conflictBorders.includes(otherCode)) {
            riskMap[code].conflictBorders.push(otherCode)
          }
        })
      })
    })
    
    return riskMap
  }, [clusters])

  // País seleccionado con datos completos
  const selectedCountryData = useMemo(() => {
    if (!selectedCountry) return null
    
    const country = countries.find(c => c.code === selectedCountry)
    const riskData = countryRiskData[selectedCountry]
    
    if (!country) return null
    
    return {
      ...country,
      riskData,
      clusters: riskData?.clusters || [],
      articles: articles.filter(a => a.countries?.includes(selectedCountry)),
      marketSymbols: marketSymbols.filter(s => s.countries?.includes(selectedCountry))
    }
  }, [selectedCountry, countries, countryRiskData, clusters, articles, marketSymbols])

  // Extract map_data from clusters with full cluster data
  const mapLocations = useMemo(() => {
    const locations: Array<{
      id: string
      name: string
      coordinates: [number, number]
      significance: 'primary' | 'secondary' | 'tertiary'
      clusterId: string
      clusterTitle: string
      severity: number
      type: 'location' | 'conflict_zone'
      clusterData?: {
        countries: string[]
        topics: string[]
        articleCount: number
        marketImpact?: { direction: string; magnitude: string }
        summary?: string
        entities?: { organizations?: string[]; people?: string[] }
      }
    }> = []
    
    clusters.forEach((cluster) => {
      const entities = cluster.entities as any
      const mapData = entities?.map_data
      
      // Extraer datos adicionales del cluster
      const clusterData = {
        countries: cluster.countries || [],
        topics: cluster.topics || [],
        articleCount: cluster.article_count || 0,
        marketImpact: entities?.market_impact,
        summary: entities?.executive_summary || cluster.summary,
        entities: {
          organizations: entities?.organizations || [],
          people: entities?.people || [],
        }
      }
      
      if (mapData) {
        // Primary locations with coordinates
        if (mapData.primary_locations && Array.isArray(mapData.primary_locations)) {
          mapData.primary_locations.forEach((loc: any) => {
            if (loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
              locations.push({
                id: `${cluster.id}-${loc.name}`,
                name: loc.name,
                coordinates: [loc.coordinates.lng, loc.coordinates.lat],
                significance: loc.significance || 'secondary',
                clusterId: cluster.id,
                clusterTitle: cluster.canonical_title,
                severity: cluster.severity,
                type: 'location',
                clusterData,
              })
            }
          })
        }
        
        // Conflict zones
        if (mapData.conflict_zones && Array.isArray(mapData.conflict_zones)) {
          mapData.conflict_zones.forEach((zone: string) => {
            const coords = knownConflictZones[zone] || 
              (cluster.countries.length > 0 ? countryCoordinates[cluster.countries[0]] : null)
            
            if (coords) {
              locations.push({
                id: `${cluster.id}-conflict-${zone}`,
                name: zone,
                coordinates: coords,
                significance: 'primary',
                clusterId: cluster.id,
                clusterTitle: cluster.canonical_title,
                severity: cluster.severity,
                type: 'conflict_zone',
                clusterData,
              })
            }
          })
        }
      }
    })
    
    return locations
  }, [clusters])

  // Generar GeoJSON de países con datos de riesgo
  const countriesGeoJSON = useMemo(() => {
    // Esto se actualizará cuando se cargue el GeoJSON de países
    // Por ahora retornamos null y lo actualizaremos dinámicamente
    return null
  }, [countryRiskData])

  // Generar líneas de conexión entre puntos del mismo cluster
  const clusterConnections = useMemo(() => {
    const connectionsByCluster: Record<string, Array<[number, number]>> = {}
    
    mapLocations.forEach(loc => {
      if (!connectionsByCluster[loc.clusterId]) {
        connectionsByCluster[loc.clusterId] = []
      }
      connectionsByCluster[loc.clusterId].push(loc.coordinates)
    })
    
    // También agregar las coordenadas de los países del cluster
    clusters.forEach(cluster => {
      if (!connectionsByCluster[cluster.id]) {
        connectionsByCluster[cluster.id] = []
      }
      
      cluster.countries.forEach(code => {
        const coords = countryCoordinates[code]
        if (coords) {
          // Evitar duplicados
          const exists = connectionsByCluster[cluster.id].some(
            c => Math.abs(c[0] - coords[0]) < 0.01 && Math.abs(c[1] - coords[1]) < 0.01
          )
          if (!exists) {
            connectionsByCluster[cluster.id].push(coords)
          }
        }
      })
    })
    
    // Crear GeoJSON de líneas para cada cluster
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = []
    
    Object.entries(connectionsByCluster).forEach(([clusterId, coords]) => {
      if (coords.length < 2) return
      
      const cluster = clusters.find(c => c.id === clusterId)
      const severity = cluster?.severity || 50
      
      // Crear líneas entre todos los puntos (como una red)
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          features.push({
            type: 'Feature',
            properties: {
              clusterId,
              severity,
            },
            geometry: {
              type: 'LineString',
              coordinates: [coords[i], coords[j]],
            },
          })
        }
      }
    })
    
    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [mapLocations, clusters])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!MAPBOX_TOKEN) {
      console.warn('NEXT_PUBLIC_MAPBOX_TOKEN not set - Mapbox globe will not render. Get a free token at https://account.mapbox.com/')
    }
    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style === 'dark' 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [0, 20],
      zoom: 1.5,
      minZoom: 0.5,
      maxZoom: 10,
      pitch: 0,
      bearing: 0,
      projection: {
        name: 'globe'
      } as any,
    })

    map.current.on('load', () => {
      if (!map.current) return
      
      // Enable globe projection with atmosphere
      if (map.current.getStyle().layers) {
        map.current.setProjection({
          name: 'globe'
        } as any)
        
        // Add atmosphere glow effect for better 3D globe appearance
        map.current.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6
        } as any)
      }
      
      // Añadir source y layer para las líneas de conexión (solo si no existe)
      if (!map.current.getSource('cluster-connections')) {
        map.current.addSource('cluster-connections', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        })
        
        // Layer para las líneas de conexión con efecto de brillo
        map.current.addLayer({
          id: 'cluster-connections-glow',
          type: 'line',
          source: 'cluster-connections',
          paint: {
            'line-color': [
              'case',
              ['>', ['get', 'severity'], 60], 'rgba(239, 68, 68, 0.3)',
              ['>', ['get', 'severity'], 40], 'rgba(245, 158, 11, 0.3)',
              'rgba(59, 130, 246, 0.3)'
            ],
            'line-width': 6,
            'line-blur': 3,
          },
        })
        
        map.current.addLayer({
          id: 'cluster-connections-line',
          type: 'line',
          source: 'cluster-connections',
          paint: {
            'line-color': [
              'case',
              ['>', ['get', 'severity'], 60], 'rgba(239, 68, 68, 0.8)',
              ['>', ['get', 'severity'], 40], 'rgba(245, 158, 11, 0.8)',
              'rgba(59, 130, 246, 0.8)'
            ],
            'line-width': 1.5,
            'line-dasharray': [2, 2],
          },
        })
      }
      
      // El source de países se creará dinámicamente en el efecto updateCountryLayers
      // No lo creamos aquí para evitar conflictos
      
      // Wait a bit for projection to be fully applied
      setTimeout(() => {
        setMapReady(true)
      }, 500)
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    }), 'bottom-right')

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'bottom-right'
    )

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update style
  useEffect(() => {
    if (map.current) {
      const newStyle = style === 'dark' 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/satellite-streets-v12'
      
      map.current.setStyle(newStyle)
      map.current.once('style.load', () => {
        if (map.current && map.current.getStyle().layers) {
          map.current.setProjection({
            name: 'globe'
          } as any)
          map.current.setFog({
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': 'rgb(11, 11, 25)',
            'star-intensity': 0.6
          } as any)
          
          // Re-añadir source y layers para las líneas de conexión
          if (!map.current.getSource('cluster-connections')) {
            map.current.addSource('cluster-connections', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [],
              },
            })
            
            map.current.addLayer({
              id: 'cluster-connections-glow',
              type: 'line',
              source: 'cluster-connections',
              paint: {
                'line-color': [
                  'case',
                  ['>', ['get', 'severity'], 60], 'rgba(239, 68, 68, 0.3)',
                  ['>', ['get', 'severity'], 40], 'rgba(245, 158, 11, 0.3)',
                  'rgba(59, 130, 246, 0.3)'
                ],
                'line-width': 6,
                'line-blur': 3,
              },
            })
            
            map.current.addLayer({
              id: 'cluster-connections-line',
              type: 'line',
              source: 'cluster-connections',
              paint: {
                'line-color': [
                  'case',
                  ['>', ['get', 'severity'], 60], 'rgba(239, 68, 68, 0.8)',
                  ['>', ['get', 'severity'], 40], 'rgba(245, 158, 11, 0.8)',
                  'rgba(59, 130, 246, 0.8)'
                ],
                'line-width': 1.5,
                'line-dasharray': [2, 2],
              },
            })
          }
          
          // El source de países se recreará automáticamente en el efecto updateCountryLayers
          // cuando el mapa esté listo
        }
      })
    }
  }, [style])

  // Actualizar colores de países según riesgo usando un enfoque más directo
  useEffect(() => {
    if (!map.current || !mapReady) return
    
    const updateCountryLayers = async () => {
      try {
        // Cargar GeoJSON de países
        const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
        const geoJSON = await response.json()
        
        // Añadir datos de riesgo a cada feature
        geoJSON.features = geoJSON.features.map((feature: any) => {
          const code = feature.properties.ISO_A2 || feature.properties.iso_a2
          const riskData = countryRiskData[code]
          const risk = riskData?.maxSeverity || 0
          
          // Determinar color según riesgo
          let fillColor = 'rgba(100, 100, 100, 0.1)'
          if (risk > 60) {
            fillColor = 'rgba(220, 38, 38, 0.5)'
          } else if (risk > 40) {
            fillColor = 'rgba(245, 158, 11, 0.4)'
          } else if (risk > 20) {
            fillColor = 'rgba(59, 130, 246, 0.3)'
          }
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              risk,
              fillColor,
              hasConflict: (riskData?.conflictBorders.length || 0) > 0,
              isSelected: selectedCountry === code,
            }
          }
        })
        
        if (!map.current) return
        
        // Actualizar source GeoJSON
        const source = map.current.getSource('countries-risk') as mapboxgl.GeoJSONSource
        if (source && source.type === 'geojson') {
          source.setData(geoJSON)
        } else {
          // Si el source no existe o es vector, crear uno nuevo GeoJSON
          if (map.current.getSource('countries-risk')) {
            map.current.removeLayer('countries-risk-fill')
            map.current.removeLayer('countries-selected')
            map.current.removeLayer('conflict-borders')
            map.current.removeSource('countries-risk')
          }
          
          map.current.addSource('countries-risk', {
            type: 'geojson',
            data: geoJSON,
          })
          
          // Añadir layers
          map.current.addLayer({
            id: 'countries-risk-fill',
            type: 'fill',
            source: 'countries-risk',
            paint: {
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': 0.7,
            },
          }, 'waterway-label')
          
          map.current.addLayer({
            id: 'countries-selected',
            type: 'line',
            source: 'countries-risk',
            paint: {
              'line-color': '#6366f1',
              'line-width': 3,
              'line-opacity': [
                'case',
                ['get', 'isSelected'],
                1,
                0
              ],
            },
          })
          
          map.current.addLayer({
            id: 'conflict-borders',
            type: 'line',
            source: 'countries-risk',
            paint: {
              'line-color': 'rgba(239, 68, 68, 0.9)',
              'line-width': 2.5,
              'line-dasharray': [3, 2],
              'line-opacity': [
                'case',
                ['get', 'hasConflict'],
                0.9,
                0
              ],
            },
          })
        }
      } catch (error) {
        console.error('Error updating country layers:', error)
      }
    }
    
    updateCountryLayers()
  }, [mapReady, countryRiskData, selectedCountry, style])

  // Update markers and connection lines
  useEffect(() => {
    if (!map.current || !mapReady) return
    
    // Wait for map to be fully ready with globe projection
    const updateMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Actualizar las líneas de conexión
      const source = map.current?.getSource('cluster-connections') as mapboxgl.GeoJSONSource
      if (source) {
        source.setData(clusterConnections)
      }

      const aiLocationsLayer = layers.find(l => l.id === 'ai-locations')
      if (aiLocationsLayer?.visible === false) {
        return
      }

      // Add markers for AI-enriched locations (following Mapbox documentation)
      mapLocations.forEach((loc) => {
        // Ensure coordinates are valid [lng, lat] format
        const [lng, lat] = loc.coordinates
        if (typeof lng !== 'number' || typeof lat !== 'number' || 
            isNaN(lng) || isNaN(lat) || 
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.warn(`Invalid coordinates for ${loc.name}:`, loc.coordinates)
          return
        }

        // Create marker element according to Mapbox docs
        // Use a container that won't be transformed (critical for globe 3D)
        const container = document.createElement('div')
        container.style.width = '20px'
        container.style.height = '20px'
        container.style.display = 'flex'
        container.style.alignItems = 'center'
        container.style.justifyContent = 'center'
        container.style.cursor = 'pointer'
        // Critical: No position/transform styles on container - let Mapbox handle positioning
        // This ensures markers stay fixed on globe surface
        
        // Create the actual marker dot (inner element for hover)
        const el = document.createElement('div')
        el.className = 'custom-marker'
        
        // Smaller, more elegant sizes
        const baseSize = loc.type === 'conflict_zone' ? 8 : loc.significance === 'primary' ? 7 : 6
        const color = loc.type === 'conflict_zone' 
          ? '#dc2626' 
          : loc.severity > 60 
            ? '#ef4444' 
            : loc.severity > 40 
              ? '#f59e0b' 
              : '#3b82f6'
        
        el.style.width = `${baseSize}px`
        el.style.height = `${baseSize}px`
        el.style.borderRadius = '50%'
        el.style.backgroundColor = color
        el.style.border = '2px solid rgba(255,255,255,0.9)'
        el.style.boxShadow = `0 0 0 3px ${color}40, 0 2px 6px rgba(0,0,0,0.5)`
        el.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease'
        el.style.position = 'relative'
        el.style.margin = 'auto'
        el.style.transform = 'scale(1)'
        el.style.transformOrigin = 'center center'

        // Add pulsing ring for primary locations (behind the dot)
        if (loc.significance === 'primary' || loc.type === 'conflict_zone') {
          const ring = document.createElement('div')
          ring.style.position = 'absolute'
          ring.style.top = '50%'
          ring.style.left = '50%'
          ring.style.transform = 'translate(-50%, -50%)'
          ring.style.width = `${baseSize + 6}px`
          ring.style.height = `${baseSize + 6}px`
          ring.style.borderRadius = '50%'
          ring.style.border = `1.5px solid ${color}`
          ring.style.opacity = '0.6'
          ring.style.animation = 'pulse-ring 2s infinite'
          ring.style.pointerEvents = 'none'
          ring.style.zIndex = '0'
          container.appendChild(ring)
        }

        container.appendChild(el)

        // Hover effect - only scale the inner dot, NEVER the container
        // Container must remain untransformed for correct globe positioning
        container.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.4)'
          el.style.boxShadow = `0 0 0 4px ${color}60, 0 3px 10px rgba(0,0,0,0.7)`
        })
        container.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)'
          el.style.boxShadow = `0 0 0 3px ${color}40, 0 2px 6px rgba(0,0,0,0.5)`
        })

        // Create popup with full dark mode styling using generatePopupHTML
        const popup = new mapboxgl.Popup({
          offset: [0, -15],
          closeButton: true,
          closeOnClick: true,
          className: 'intel-popup',
          maxWidth: '380px',
          anchor: 'bottom'
        }).setHTML(generatePopupHTML(loc, countriesMap))

        // Create marker according to Mapbox documentation
        // For globe 3D, use rotationAlignment: 'map' and pitchAlignment: 'map'
        // to keep markers fixed on the globe surface
        const marker = new mapboxgl.Marker({ 
          element: container,
          anchor: 'center',
          rotationAlignment: 'map',
          pitchAlignment: 'map',
          altitude: 0
        })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!)

        // Click handler - toggle popup on click
        container.addEventListener('click', (e) => {
          e.stopPropagation()
          marker.togglePopup()
        })

        markersRef.current.push(marker)
      })

      // Add country hotspots (smaller, subtle markers)
      const clustersLayer = layers.find(l => l.id === 'clusters')
      if (clustersLayer?.visible !== false) {
        const countryData: Record<string, { count: number; maxSeverity: number }> = {}
        
        clusters.forEach((cluster) => {
          cluster.countries.forEach((code) => {
            if (!countryData[code]) {
              countryData[code] = { count: 0, maxSeverity: 0 }
            }
            countryData[code].count++
            countryData[code].maxSeverity = Math.max(countryData[code].maxSeverity, cluster.severity)
          })
        })

        Object.entries(countryData).forEach(([code, data]) => {
          const coords = countryCoordinates[code]
          if (!coords || data.maxSeverity < 30) return

          // Ensure coordinates are valid [lng, lat] format
          const [lng, lat] = coords
          if (typeof lng !== 'number' || typeof lat !== 'number' || 
              isNaN(lng) || isNaN(lat) || 
              lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            console.warn(`Invalid coordinates for country ${code}:`, coords)
            return
          }

          // Create marker container (won't be transformed - critical for globe 3D)
          const container = document.createElement('div')
          container.style.width = '12px'
          container.style.height = '12px'
          container.style.display = 'flex'
          container.style.alignItems = 'center'
          container.style.justifyContent = 'center'
          container.style.cursor = 'pointer'
          // Critical: No position/transform styles on container - let Mapbox handle positioning
          
          // Create marker element (inner dot for hover)
          const el = document.createElement('div')
          el.className = 'country-hotspot'
          
          // Smaller, subtle markers
          const baseSize = Math.min(3, Math.max(2, Math.log(data.count + 1)))
          const color = data.maxSeverity > 60 
            ? '#dc2626' 
            : data.maxSeverity > 40 
              ? '#ef4444' 
              : '#f59e0b'
          
          el.style.width = `${baseSize}px`
          el.style.height = `${baseSize}px`
          el.style.borderRadius = '50%'
          el.style.backgroundColor = color
          el.style.border = '1px solid rgba(255,255,255,0.6)'
          el.style.opacity = '0.6'
          el.style.transition = 'transform 0.2s ease, opacity 0.2s ease'
          el.style.margin = 'auto'
          el.style.transform = 'scale(1)'
          el.style.transformOrigin = 'center center'
          
          container.appendChild(el)
          
          // Hover effect - only scale the inner dot, NEVER the container
          container.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.5)'
            el.style.opacity = '0.9'
          })
          container.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)'
            el.style.opacity = '0.6'
          })

          const popup = new mapboxgl.Popup({
            offset: [0, -8],
            closeButton: true,
            closeOnClick: true,
            maxWidth: '200px',
            anchor: 'bottom'
          }).setHTML(`
            <div class="cluster-popup-content">
              <div class="cluster-popup-title">${countries.find(c => c.code === code)?.name || code}</div>
              <div class="cluster-popup-metric">
                <span class="cluster-popup-label">Eventos:</span>
                <span class="cluster-popup-value">${data.count}</span>
              </div>
              <div class="cluster-popup-metric">
                <span class="cluster-popup-label">Severidad:</span>
                <span class="cluster-popup-value severity-${data.maxSeverity > 60 ? 'high' : 'medium'}">${data.maxSeverity}</span>
              </div>
            </div>
          `)

          const marker = new mapboxgl.Marker({ 
            element: container,
            anchor: 'center',
            rotationAlignment: 'map',
            pitchAlignment: 'map',
            altitude: 0
          })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map.current!)

          container.addEventListener('click', (e) => {
            e.stopPropagation()
            marker.togglePopup()
            onCountryClick(code)
          })

          markersRef.current.push(marker)
        })
      }
    }
    
    // Wait for map to be idle before adding markers
    if (map.current.loaded()) {
      updateMarkers()
    } else {
      map.current.once('idle', updateMarkers)
    }
    
    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }
  }, [mapLocations, clusters, countries, layers, mapReady, onClusterClick, onCountryClick, clusterConnections, countriesMap])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-intel-surface/80 z-10">
          <div className="text-sm text-intel-muted animate-pulse">Cargando globo...</div>
        </div>
      )}
      
      {/* Panel de información del país seleccionado */}
      {selectedCountryData && (
        <div className="absolute top-4 right-4 w-96 bg-intel-surface border border-intel-border rounded-lg shadow-2xl z-20 max-h-[85vh] overflow-y-auto">
          <div className="p-4 border-b border-intel-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="intel-title text-lg">{selectedCountryData.name}</h2>
                <p className="intel-subtitle text-xs mt-1">{selectedCountryData.code}</p>
              </div>
              <button
                onClick={() => onCountryClick(null)}
                className="text-intel-muted hover:text-intel-text transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Indicador de riesgo */}
            {selectedCountryData.riskData && (
              <div className="bg-intel-bg border border-intel-border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="intel-subtitle text-xs">NIVEL DE RIESGO</span>
                  <span className={`text-sm font-bold ${
                    selectedCountryData.riskData.maxSeverity > 60 ? 'text-red-500' :
                    selectedCountryData.riskData.maxSeverity > 40 ? 'text-amber-500' :
                    'text-blue-500'
                  }`}>
                    {selectedCountryData.riskData.maxSeverity > 60 ? 'CRÍTICO' :
                     selectedCountryData.riskData.maxSeverity > 40 ? 'ALTO' :
                     selectedCountryData.riskData.maxSeverity > 20 ? 'MEDIO' : 'BAJO'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-intel-muted">
                  <span>Severidad: {selectedCountryData.riskData.maxSeverity}</span>
                  <span>•</span>
                  <span>{selectedCountryData.riskData.clusterCount} clusters</span>
                </div>
              </div>
            )}
            
            {/* Clusters relacionados */}
            {selectedCountryData.clusters.length > 0 && (
              <div>
                <h3 className="intel-subtitle text-xs mb-2">CLUSTERS RELACIONADOS</h3>
                <div className="space-y-2">
                  {selectedCountryData.clusters.slice(0, 5).map(cluster => (
                    <div
                      key={cluster.id}
                      className="bg-intel-bg border border-intel-border rounded p-2 cursor-pointer hover:bg-intel-border transition-colors"
                      onClick={() => onClusterClick?.(cluster.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-intel-text line-clamp-1">
                          {cluster.canonical_title}
                        </span>
                        <span className={`text-xs font-mono ${
                          cluster.severity > 60 ? 'text-red-500' :
                          cluster.severity > 40 ? 'text-amber-500' : 'text-blue-500'
                        }`}>
                          {cluster.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Artículos */}
            {selectedCountryData.articles.length > 0 && (
              <div>
                <h3 className="intel-subtitle text-xs mb-2">ARTÍCULOS ({selectedCountryData.articles.length})</h3>
                <div className="text-xs text-intel-muted">
                  {selectedCountryData.articles.slice(0, 3).map(article => (
                    <div key={article.id} className="mb-2 line-clamp-2">
                      {article.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Símbolos de mercado */}
            {selectedCountryData.marketSymbols.length > 0 && (
              <div>
                <h3 className="intel-subtitle text-xs mb-2">SÍMBOLOS DE MERCADO</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCountryData.marketSymbols.map(symbol => (
                    <span key={symbol.id} className="intel-badge text-xs">
                      {symbol.symbol}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fronteras de conflicto */}
            {selectedCountryData.riskData?.conflictBorders.length > 0 && (
              <div>
                <h3 className="intel-subtitle text-xs mb-2">FRONTERAS CON CONFLICTOS</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCountryData.riskData.conflictBorders.map(code => (
                    <span key={code} className="intel-badge text-xs bg-red-500/20 border-red-500/50">
                      {countriesMap[code] || code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
