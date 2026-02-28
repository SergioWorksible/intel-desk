'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps'
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

interface GeopoliticalMapViewProps {
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

// TopoJSON URL
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Geopolitical alliances
const geopoliticalAlliances = {
  nato: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'CA', 'TR', 'PL', 'NL', 'BE', 'NO', 'DK', 'PT'],
  eu: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'PT', 'IE', 'GR', 'PL'],
  brics: ['BR', 'RU', 'IN', 'CN', 'ZA', 'IR', 'EG'],
  sco: ['RU', 'CN', 'IN', 'PK', 'IR'],
}

// ISO numeric to ISO alpha-2 mapping (for world-atlas TopoJSON)
const numericToAlpha2: Record<string, string> = {
  '840': 'US', '156': 'CN', '643': 'RU', '826': 'GB', '276': 'DE', '250': 'FR',
  '392': 'JP', '356': 'IN', '076': 'BR', '036': 'AU', '124': 'CA', '410': 'KR',
  '682': 'SA', '364': 'IR', '376': 'IL', '792': 'TR', '804': 'UA', '616': 'PL',
  '158': 'TW', '484': 'MX', '360': 'ID', '818': 'EG', '710': 'ZA', '566': 'NG',
  '586': 'PK', '408': 'KP', '862': 'VE', '004': 'AF', '760': 'SY', '887': 'YE',
  '724': 'ES', '380': 'IT', '528': 'NL', '056': 'BE', '756': 'CH', '040': 'AT',
  '752': 'SE', '578': 'NO', '208': 'DK', '246': 'FI', '300': 'GR', '620': 'PT',
  '372': 'IE', '203': 'CZ', '348': 'HU', '642': 'RO', '100': 'BG', '688': 'RS',
  '191': 'HR', '703': 'SK', '705': 'SI', '440': 'LT', '428': 'LV', '233': 'EE',
  '112': 'BY', '498': 'MD', '268': 'GE', '051': 'AM', '031': 'AZ', '398': 'KZ',
  '860': 'UZ', '795': 'TM', '762': 'TJ', '417': 'KG', '496': 'MN', '764': 'TH',
  '704': 'VN', '608': 'PH', '458': 'MY', '702': 'SG', '050': 'BD', '144': 'LK',
  '104': 'MM', '116': 'KH', '418': 'LA', '554': 'NZ', '032': 'AR', '152': 'CL',
  '170': 'CO', '604': 'PE', '218': 'EC', '068': 'BO', '600': 'PY', '858': 'UY',
  '012': 'DZ', '504': 'MA', '788': 'TN', '434': 'LY', '736': 'SD', '231': 'ET',
  '404': 'KE', '834': 'TZ', '800': 'UG', '288': 'GH', '384': 'CI', '686': 'SN',
  '466': 'ML', '562': 'NE', '148': 'TD', '120': 'CM', '180': 'CD', '024': 'AO',
  '716': 'ZW', '508': 'MZ', '454': 'MW', '894': 'ZM', '072': 'BW', '516': 'NA',
  '368': 'IQ', '400': 'JO', '422': 'LB', '414': 'KW', '784': 'AE', '634': 'QA',
  '048': 'BH', '512': 'OM', '192': 'CU', '214': 'DO', '332': 'HT', '388': 'JM',
  '320': 'GT', '084': 'BZ', '340': 'HN', '222': 'SV', '558': 'NI', '188': 'CR',
  '591': 'PA', '352': 'IS', '442': 'LU', '470': 'MT', '196': 'CY', '008': 'AL',
  '070': 'BA', '807': 'MK', '499': 'ME',
  // Additional countries
  '090': 'SB', '296': 'KI', '520': 'NR', '583': 'FM', '584': 'MH', '585': 'PW',
  '798': 'TV', '548': 'VU', '882': 'WS', '776': 'TO', '242': 'FJ', '598': 'PG',
  '626': 'TL', '096': 'BN', '524': 'NP', '064': 'BT', '462': 'MV',
  '174': 'KM', '480': 'MU', '690': 'SC', '262': 'DJ', '232': 'ER', '728': 'SS',
  '140': 'CF', '178': 'CG', '266': 'GA', '226': 'GQ', '678': 'ST', '204': 'BJ',
  '854': 'BF', '132': 'CV', '270': 'GM', '324': 'GN', '624': 'GW', '430': 'LR',
  '478': 'MR', '768': 'TG', '748': 'SZ', '426': 'LS', '646': 'RW', '108': 'BI',
  '732': 'EH', '706': 'SO', '275': 'PS',
  '780': 'TT', '044': 'BS', '052': 'BB', '060': 'BM', '092': 'VG', '136': 'KY',
  '630': 'PR', '850': 'VI', '660': 'AI', '028': 'AG', '533': 'AW', '531': 'CW',
  '212': 'DM', '308': 'GD', '312': 'GP', '474': 'MQ', '500': 'MS', '659': 'KN',
  '662': 'LC', '670': 'VC', '534': 'SX', '796': 'TC', '740': 'SR', '328': 'GY',
  '254': 'GF', '238': 'FK',
}

// Country names for display when not in database
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
  'RO': 'Rumanía', 'BG': 'Bulgaria', 'RS': 'Serbia', 'HR': 'Croacia', 'SK': 'Eslovaquia',
  'SI': 'Eslovenia', 'LT': 'Lituania', 'LV': 'Letonia', 'EE': 'Estonia', 'BY': 'Bielorrusia',
  'MD': 'Moldavia', 'GE': 'Georgia', 'AM': 'Armenia', 'AZ': 'Azerbaiyán', 'KZ': 'Kazajistán',
  'UZ': 'Uzbekistán', 'TM': 'Turkmenistán', 'TJ': 'Tayikistán', 'KG': 'Kirguistán', 'MN': 'Mongolia',
  'TH': 'Tailandia', 'VN': 'Vietnam', 'PH': 'Filipinas', 'MY': 'Malasia', 'SG': 'Singapur',
  'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'MM': 'Myanmar', 'KH': 'Camboya', 'LA': 'Laos',
  'NZ': 'Nueva Zelanda', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Perú',
  'EC': 'Ecuador', 'BO': 'Bolivia', 'PY': 'Paraguay', 'UY': 'Uruguay', 'DZ': 'Argelia',
  'MA': 'Marruecos', 'TN': 'Túnez', 'LY': 'Libia', 'SD': 'Sudán', 'ET': 'Etiopía',
  'KE': 'Kenia', 'TZ': 'Tanzania', 'UG': 'Uganda', 'GH': 'Ghana', 'CI': 'Costa de Marfil',
  'SN': 'Senegal', 'ML': 'Malí', 'NE': 'Níger', 'TD': 'Chad', 'CM': 'Camerún',
  'CD': 'RD Congo', 'AO': 'Angola', 'ZW': 'Zimbabue', 'MZ': 'Mozambique', 'MW': 'Malaui',
  'ZM': 'Zambia', 'BW': 'Botsuana', 'NA': 'Namibia', 'IQ': 'Irak', 'JO': 'Jordania',
  'LB': 'Líbano', 'KW': 'Kuwait', 'AE': 'Emiratos Árabes', 'QA': 'Catar', 'BH': 'Baréin',
  'OM': 'Omán', 'CU': 'Cuba', 'DO': 'República Dominicana', 'HT': 'Haití', 'JM': 'Jamaica',
  'GT': 'Guatemala', 'BZ': 'Belice', 'HN': 'Honduras', 'SV': 'El Salvador', 'NI': 'Nicaragua',
  'CR': 'Costa Rica', 'PA': 'Panamá', 'IS': 'Islandia', 'LU': 'Luxemburgo', 'MT': 'Malta',
  'CY': 'Chipre', 'AL': 'Albania', 'BA': 'Bosnia', 'MK': 'Macedonia del Norte', 'ME': 'Montenegro',
  'SS': 'Sudán del Sur', 'ER': 'Eritrea', 'DJ': 'Yibuti', 'SO': 'Somalia', 'CF': 'Rep. Centroafricana',
  'CG': 'Congo', 'GA': 'Gabón', 'GQ': 'Guinea Ecuatorial', 'NP': 'Nepal', 'BT': 'Bután',
  'MV': 'Maldivas', 'RW': 'Ruanda', 'BI': 'Burundi', 'PS': 'Palestina', 'XK': 'Kosovo',
}

export default function GeopoliticalMapView({
  clusters,
  articles,
  marketSymbols,
  countries,
  layers,
  onCountryClick,
  selectedCountry,
  showAlliances = false,
}: GeopoliticalMapViewProps) {
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    console.log('🗺️ Map data:', {
      clusters: clusters.length,
      articles: articles.length,
      countries: countries.length,
      showAlliances,
    })
  }, [clusters, articles, countries, showAlliances])

  // Build country data map
  const countryData = useMemo(() => {
    const data: Record<string, {
      clusterCount: number
      maxSeverity: number
      articleCount: number
      hasData: boolean
      geopoliticalRisk: number
      conflictIntensity: number
      watchlistStatus: boolean
    }> = {}

    // Initialize from countries array
    countries.forEach((country) => {
      data[country.code] = {
        clusterCount: 0,
        maxSeverity: 0,
        articleCount: 0,
        hasData: false,
        geopoliticalRisk: 0,
        conflictIntensity: 0,
        watchlistStatus: country.watchlist || false,
      }
    })

    // Process clusters
    clusters.forEach((cluster) => {
      cluster.countries.forEach((code) => {
        if (!data[code]) {
          data[code] = {
            clusterCount: 0, maxSeverity: 0, articleCount: 0,
            hasData: false, geopoliticalRisk: 0, conflictIntensity: 0, watchlistStatus: false,
          }
        }
        data[code].clusterCount++
        data[code].maxSeverity = Math.max(data[code].maxSeverity, cluster.severity)
        data[code].hasData = true
        data[code].geopoliticalRisk = Math.max(data[code].geopoliticalRisk, cluster.severity * 0.8)
        
        if (cluster.countries.length > 1) {
          data[code].conflictIntensity += cluster.severity / cluster.countries.length
        }
      })
    })

    // Process articles
    articles.forEach((article) => {
      article.countries.forEach((code) => {
        if (data[code]) {
          data[code].articleCount++
          data[code].hasData = true
        }
      })
    })

    return data
  }, [clusters, articles, countries])

  // Build conflict lines from clusters
  const conflictLines = useMemo(() => {
    const lines: Array<{ from: string; to: string; intensity: number }> = []
    
    clusters.forEach((cluster) => {
      if (cluster.countries.length >= 2 && cluster.severity > 40) {
        for (let i = 0; i < cluster.countries.length; i++) {
          for (let j = i + 1; j < cluster.countries.length; j++) {
            const from = cluster.countries[i]
            const to = cluster.countries[j]
            
            if (countryCoordinates[from] && countryCoordinates[to]) {
              const existing = lines.find(l => 
                (l.from === from && l.to === to) || (l.from === to && l.to === from)
              )
              if (existing) {
                existing.intensity = Math.max(existing.intensity, cluster.severity)
              } else {
                lines.push({ from, to, intensity: cluster.severity })
              }
            }
          }
        }
      }
    })

    console.log('⚔️ Conflict lines:', lines.length)
    return lines
  }, [clusters])

  // Build alliance lines
  const allianceLines = useMemo(() => {
    if (!showAlliances) return []
    
    const lines: Array<{ from: string; to: string; alliance: string }> = []
    
    Object.entries(geopoliticalAlliances).forEach(([name, members]) => {
      // Only show lines between first few members to avoid clutter
      for (let i = 0; i < Math.min(members.length, 5); i++) {
        for (let j = i + 1; j < Math.min(members.length, 5); j++) {
          if (countryCoordinates[members[i]] && countryCoordinates[members[j]]) {
            lines.push({
              from: members[i],
              to: members[j],
              alliance: name.toUpperCase(),
            })
          }
        }
      }
    })

    console.log('🤝 Alliance lines:', lines.length)
    return lines
  }, [showAlliances])

  // Extract map_data from clusters (primary_locations, conflict_zones, etc.)
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
    }> = []
    
    clusters.forEach((cluster) => {
      // Extract map_data from entities JSONB field
      const entities = cluster.entities as any
      const mapData = entities?.map_data
      
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
              })
            }
          })
        }
        
        // Conflict zones (try to find coordinates by name or use country center)
        if (mapData.conflict_zones && Array.isArray(mapData.conflict_zones)) {
          mapData.conflict_zones.forEach((zone: string) => {
            // Try to find coordinates for known conflict zones
            const knownZones: Record<string, [number, number]> = {
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
            }
            
            const coords = knownZones[zone] || 
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
              })
            }
          })
        }
      }
    })
    
    console.log('📍 Map locations from enrichment:', locations.length)
    return locations
  }, [clusters])

  // Build hotspots
  const hotspots = useMemo(() => {
    const spots = Object.entries(countryData)
      .filter(([code, data]) => {
        return data.geopoliticalRisk > 30 || data.watchlistStatus || data.conflictIntensity > 20
      })
      .map(([code, data]) => {
        const coords = countryCoordinates[code]
        if (!coords) return null
        
        const country = countries.find(c => c.code === code)
        const riskLevel = Math.max(data.geopoliticalRisk, data.conflictIntensity)
        
        return {
          code,
          name: country?.name || code,
          coordinates: coords,
          riskLevel,
          riskType: riskLevel > 60 ? 'crisis' : riskLevel > 40 ? 'high-risk' : 'tension',
        }
      })
      .filter(Boolean) as Array<{ code: string; name: string; coordinates: [number, number]; riskLevel: number; riskType: string }>

    console.log('🔴 Hotspots:', spots.length)
    return spots
  }, [countryData, countries])

  // Get country color
  const getCountryColor = (code: string): string => {
    const data = countryData[code]
    
    if (!data) return '#2a2a35'
    
    if (data.geopoliticalRisk > 60) return 'rgba(220, 38, 38, 0.7)'
    if (data.geopoliticalRisk > 40) return 'rgba(239, 68, 68, 0.5)'
    if (data.geopoliticalRisk > 20) return 'rgba(217, 119, 6, 0.5)'
    if (data.watchlistStatus) return 'rgba(245, 158, 11, 0.4)'
    if (data.hasData) return 'rgba(34, 197, 94, 0.3)'
    
    return '#2a2a35'
  }

  // Get alliance line color
  const getAllianceColor = (alliance: string): string => {
    switch (alliance) {
      case 'NATO': return 'rgba(59, 130, 246, 0.6)'
      case 'EU': return 'rgba(34, 197, 94, 0.6)'
      case 'BRICS': return 'rgba(168, 85, 247, 0.6)'
      case 'SCO': return 'rgba(236, 72, 153, 0.6)'
      default: return 'rgba(156, 163, 175, 0.4)'
    }
  }

  const handleMouseEnter = (code: string, name: string, e: React.MouseEvent) => {
    const data = countryData[code]
    const country = countries.find(c => c.code === code)
    const displayName = country?.name || countryNames[code] || name || code

    const content = `
      <div style="font-family: monospace; font-size: 11px; color: #e5e7eb;">
        <div style="font-weight: bold; margin-bottom: 4px; color: white;">
          ${displayName} ${data?.watchlistStatus ? '⚠️' : ''}
        </div>
        ${data?.geopoliticalRisk > 0 ? `
          <div>🌍 Riesgo: <span style="color: ${data.geopoliticalRisk > 50 ? '#dc2626' : '#d97706'}; font-weight: bold;">${Math.round(data.geopoliticalRisk)}%</span></div>
        ` : ''}
        ${data?.clusterCount > 0 ? `<div>🔴 ${data.clusterCount} eventos</div>` : ''}
        ${data?.articleCount > 0 ? `<div>📰 ${data.articleCount} artículos</div>` : ''}
        ${!data?.hasData && !country ? `<div style="color: #6b7280;">Haz clic para más info</div>` : ''}
      </div>
    `
    
    setTooltipContent(content)
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  const handleCountryClick = (code: string, name: string) => {
    // Always allow clicking, even if country not in database
    // The sidebar will fetch intel from Perplexity/OpenAI
    if (code) {
      onCountryClick(code)
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120, center: [10, 30] }}
        width={800}
        height={500}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup zoom={1}>
          {/* Countries */}
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: Geography[] }) => {
              if (!mapReady && geographies.length > 0) {
                console.log('🌍 Geographies loaded:', geographies.length)
                const firstGeo = geographies[0] as any
                console.log('📋 Sample geo:', firstGeo?.id, firstGeo?.properties)
                setMapReady(true)
              }

              return geographies.map((geo) => {
                // Convert numeric ID to alpha-2 code
                const geoAny = geo as any
                const numericId = geoAny?.id?.toString() || ''
                const code = numericToAlpha2[numericId] || geo.properties?.ISO_A2 || geo.properties?.iso_a2 || ''
                const geoName = geo.properties?.name || geo.properties?.NAME || ''
                
                const isSelected = selectedCountry === code
                const fillColor = getCountryColor(code)
                
                return (
                  <Geography
                    key={geoAny?.rsmKey || geoAny?.id}
                    geography={geo}
                    fill={fillColor}
                    stroke={isSelected ? '#6366f1' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isSelected ? 2 : 0.5}
                    style={{
                      default: { outline: 'none', cursor: 'pointer' },
                      hover: { 
                        fill: code ? fillColor : '#3a3a50', 
                        stroke: '#fff', 
                        strokeWidth: 1, 
                        outline: 'none' 
                      },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => handleCountryClick(code, geoName)}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleMouseEnter(code, geoName, e as any)}
                    onMouseLeave={() => { setTooltipContent(''); setTooltipPosition(null) }}
                  />
                )
              })
            }}
          </Geographies>

          {/* Alliance Lines */}
          {allianceLines.map((line, i) => {
            const fromCoord = countryCoordinates[line.from]
            const toCoord = countryCoordinates[line.to]
            if (!fromCoord || !toCoord) return null
            return (
              <Line
                key={`alliance-${i}`}
                coordinates={[fromCoord, toCoord]}
                stroke={getAllianceColor(line.alliance)}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )
          })}

          {/* Conflict Lines */}
          {conflictLines.map((line, i) => {
            const fromCoord = countryCoordinates[line.from]
            const toCoord = countryCoordinates[line.to]
            if (!fromCoord || !toCoord) return null
            return (
              <Line
                key={`conflict-${i}`}
                coordinates={[fromCoord, toCoord]}
                stroke={line.intensity > 60 ? '#dc2626' : '#d97706'}
                strokeWidth={Math.max(1, line.intensity / 30)}
                strokeLinecap="round"
                strokeDasharray="4 2"
              />
            )
          })}

          {/* Hotspots */}
          {hotspots.map((spot, i) => (
            <Marker key={`hotspot-${i}`} coordinates={spot.coordinates}>
              <circle
                r={Math.max(4, spot.riskLevel / 15)}
                fill={spot.riskType === 'crisis' ? '#dc2626' : spot.riskType === 'high-risk' ? '#ef4444' : '#d97706'}
                fillOpacity={0.7}
                stroke="#fff"
                strokeWidth={1}
              />
              {spot.riskLevel > 50 && (
                <text
                  textAnchor="middle"
                  y={-10}
                  style={{ fontSize: '8px', fill: '#fff', fontFamily: 'monospace' }}
                >
                  {spot.name}
                </text>
              )}
            </Marker>
          ))}

          {/* Map locations from AI enrichment (primary_locations, conflict_zones) */}
          {layers.find(l => l.id === 'ai-locations')?.visible !== false && mapLocations.map((loc) => {
            const size = loc.type === 'conflict_zone' ? 8 : loc.significance === 'primary' ? 6 : 4
            const color = loc.type === 'conflict_zone' 
              ? '#dc2626' 
              : loc.severity > 60 
                ? '#ef4444' 
                : loc.severity > 40 
                  ? '#f59e0b' 
                  : '#3b82f6'
            
            return (
              <Marker 
                key={loc.id} 
                coordinates={loc.coordinates}
                onMouseEnter={(e: any) => {
                  const content = `
                    <div style="font-family: monospace; font-size: 11px; color: #e5e7eb;">
                      <div style="font-weight: bold; margin-bottom: 4px; color: white;">
                        ${loc.type === 'conflict_zone' ? '⚔️' : '📍'} ${loc.name}
                      </div>
                      <div style="color: #9ca3af; margin-bottom: 2px;">${loc.clusterTitle}</div>
                      <div>Severidad: <span style="color: ${loc.severity > 60 ? '#dc2626' : '#d97706'}; font-weight: bold;">${loc.severity}</span></div>
                      ${loc.type === 'conflict_zone' ? '<div style="color: #dc2626;">⚠️ Zona de conflicto</div>' : ''}
                    </div>
                  `
                  setTooltipContent(content)
                  setTooltipPosition({ x: e.clientX, y: e.clientY })
                }}
                onMouseLeave={() => { setTooltipContent(''); setTooltipPosition(null) }}
              >
                <circle
                  r={size}
                  fill={color}
                  fillOpacity={0.8}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                {loc.significance === 'primary' && (
                  <circle
                    r={size + 3}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    style={{ 
                      animation: 'pulse 2s infinite',
                      transformOrigin: 'center',
                    }}
                  />
                )}
                <text
                  textAnchor="middle"
                  y={-size - 8}
                  style={{ 
                    fontSize: '9px', 
                    fill: '#fff', 
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {loc.name}
                </text>
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipContent && tooltipPosition && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y + 12,
            backgroundColor: '#12121a',
            border: '1px solid #2a2a35',
            borderRadius: '6px',
            padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}

      {/* Loading */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-intel-surface/80">
          <div className="text-sm text-intel-muted animate-pulse">Cargando mapa...</div>
        </div>
      )}
    </div>
  )
}
