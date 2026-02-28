'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Database } from '@/types/database'

type Cluster = Database['public']['Tables']['clusters']['Row']
type Country = Database['public']['Tables']['countries']['Row']

interface MapViewProps {
  clusters: Cluster[]
  countries: Country[]
  onCountryClick: (code: string | null) => void
  selectedCountry: string | null
  style: 'dark' | 'satellite'
}

// Country coordinates (simplified - in production use a proper geocoding service)
const countryCoordinates: Record<string, [number, number]> = {
  US: [-98.5795, 39.8283],
  CN: [104.1954, 35.8617],
  RU: [105.3188, 61.5240],
  GB: [-3.4360, 55.3781],
  DE: [10.4515, 51.1657],
  FR: [2.2137, 46.2276],
  JP: [138.2529, 36.2048],
  IN: [78.9629, 20.5937],
  BR: [-51.9253, -14.2350],
  AU: [133.7751, -25.2744],
  CA: [-106.3468, 56.1304],
  KR: [127.7669, 35.9078],
  SA: [45.0792, 23.8859],
  IR: [53.6880, 32.4279],
  IL: [34.8516, 31.0461],
  TR: [35.2433, 38.9637],
  UA: [31.1656, 48.3794],
  PL: [19.1451, 51.9194],
  TW: [120.9605, 23.6978],
  MX: [-102.5528, 23.6345],
  ID: [113.9213, -0.7893],
  EG: [30.8025, 26.8206],
  ZA: [22.9375, -30.5595],
  NG: [8.6753, 9.0820],
  PK: [69.3451, 30.3753],
  KP: [127.5101, 40.3399],
  VE: [-66.5897, 6.4238],
  AF: [67.7100, 33.9391],
  SY: [38.9968, 34.8021],
  YE: [48.5164, 15.5527],
}

export default function MapView({
  clusters,
  countries,
  onCountryClick,
  selectedCountry,
  style,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  // Map styles
  const styles = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  }

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styles[style],
      center: [0, 20],
      zoom: 2,
      minZoom: 1,
      maxZoom: 12,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    // Click handler for countries
    map.current.on('click', (e) => {
      // Find clicked country based on coordinates
      // In production, use vector tiles with country polygons
      const point = e.lngLat
      let closestCountry: string | null = null
      let closestDistance = Infinity

      Object.entries(countryCoordinates).forEach(([code, coords]) => {
        const distance = Math.sqrt(
          Math.pow(point.lng - coords[0], 2) + Math.pow(point.lat - coords[1], 2)
        )
        if (distance < closestDistance && distance < 10) {
          closestDistance = distance
          closestCountry = code
        }
      })

      if (closestCountry) {
        onCountryClick(closestCountry)
      }
    })

    return () => {
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

  // Update markers for clusters
  useEffect(() => {
    if (!map.current) return

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Group clusters by country
    const clustersByCountry: Record<string, Cluster[]> = {}
    clusters.forEach((cluster) => {
      cluster.countries.forEach((country) => {
        if (!clustersByCountry[country]) {
          clustersByCountry[country] = []
        }
        clustersByCountry[country].push(cluster)
      })
    })

    // Add markers
    Object.entries(clustersByCountry).forEach(([countryCode, countryClusters]) => {
      const coords = countryCoordinates[countryCode]
      if (!coords) return

      const maxSeverity = Math.max(...countryClusters.map((c) => c.severity))
      const color =
        maxSeverity >= 70
          ? '#dc2626'
          : maxSeverity >= 40
          ? '#d97706'
          : '#16a34a'

      // Create marker element
      const el = document.createElement('div')
      el.className = 'cluster-marker'
      el.style.cssText = `
        width: ${20 + countryClusters.length * 2}px;
        height: ${20 + countryClusters.length * 2}px;
        background-color: ${color};
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-family: monospace;
        box-shadow: 0 0 10px ${color}80;
        transition: transform 0.2s;
      `
      el.textContent = countryClusters.length > 1 ? String(countryClusters.length) : ''
      el.onmouseenter = () => {
        el.style.transform = 'scale(1.2)'
      }
      el.onmouseleave = () => {
        el.style.transform = 'scale(1)'
      }
      el.onclick = (e) => {
        e.stopPropagation()
        onCountryClick(countryCode)
      }

      // Create popup
      const popupContent = `
        <div style="font-family: monospace; font-size: 12px; max-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${countryCode}</div>
          <div style="color: #9ca3af;">${countryClusters.length} active event(s)</div>
          <div style="margin-top: 8px;">
            ${countryClusters
              .slice(0, 3)
              .map(
                (c) => `
              <div style="padding: 4px 0; border-top: 1px solid #374151;">
                <div style="font-size: 11px; color: #e5e7eb;">${c.canonical_title.slice(0, 50)}...</div>
                <div style="font-size: 10px; color: ${
                  c.severity >= 70 ? '#dc2626' : c.severity >= 40 ? '#d97706' : '#16a34a'
                };">Severity: ${c.severity}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `

      const popup = new maplibregl.Popup({
        offset: 15,
        closeButton: false,
        className: 'intel-popup',
      }).setHTML(popupContent)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!)

      markersRef.current.push(marker)
    })

    // Add country markers without clusters
    countries
      .filter((c) => c.watchlist && !clustersByCountry[c.code])
      .forEach((country) => {
        const coords = countryCoordinates[country.code]
        if (!coords) return

        const el = document.createElement('div')
        el.className = 'country-marker'
        el.style.cssText = `
          width: 12px;
          height: 12px;
          background-color: #6366f1;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          cursor: pointer;
          opacity: 0.6;
        `
        el.onclick = (e) => {
          e.stopPropagation()
          onCountryClick(country.code)
        }

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map.current!)

        markersRef.current.push(marker)
      })
  }, [clusters, countries, onCountryClick])

  // Fly to selected country
  useEffect(() => {
    if (map.current && selectedCountry) {
      const coords = countryCoordinates[selectedCountry]
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
        }
        .maplibregl-popup-tip {
          border-top-color: #12121a !important;
        }
      `}</style>
    </div>
  )
}

