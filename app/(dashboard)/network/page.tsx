'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Network,
  Search,
  Loader2,
  RefreshCw,
  Filter,
  Zap,
  Users,
  Building2,
  MapPin,
  Globe,
  Calendar,
} from 'lucide-react'

// Colores por tipo de entidad
const entityTypeColors: Record<string, string> = {
  person: '#dc2626',
  organization: '#2563eb',
  location: '#16a34a',
  country: '#9333ea',
  event: '#d97706',
}

// Colores por tipo de relación
const relationshipColors: Record<string, string> = {
  cooperation: '#16a34a',
  conflict: '#dc2626',
  trade: '#2563eb',
  diplomacy: '#9333ea',
  military: '#d97706',
  economic: '#f59e0b',
  influence: '#ec4899',
  mentioned_together: '#6b7280',
  membership: '#8b5cf6',
  leadership: '#10b981',
  location: '#14b8a6',
  event_participant: '#f97316',
}

const relationshipTypes = [
  'cooperation',
  'conflict',
  'trade',
  'diplomacy',
  'military',
  'economic',
  'influence',
  'mentioned_together',
  'membership',
  'leadership',
  'location',
  'event_participant',
]

function convertToFlowNodes(nodes: any[]): Node[] {
  return nodes.map((n: any) => ({
    id: n.id,
    type: 'default',
    position: { x: Math.random() * 800, y: Math.random() * 600 }, // Will be positioned by layout
    data: {
      label: (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entityTypeColors[n.type] || '#6b7280' }}
            />
            <span className="font-medium text-sm">{n.label}</span>
            <Badge variant="outline" className="text-[10px] ml-auto">
              {n.type}
            </Badge>
          </div>
          {n.metadata?.title && (
            <p className="text-xs text-intel-muted">{n.metadata.title}</p>
          )}
        </div>
      ),
      entityType: n.type,
      rawLabel: n.label,
      metadata: n.metadata,
    },
    style: {
      background: '#12121a',
      border: `2px solid ${entityTypeColors[n.type] || '#6b7280'}`,
      borderRadius: '8px',
      padding: '12px 16px',
      color: '#e4e4eb',
      fontSize: '12px',
      minWidth: '150px',
      maxWidth: '250px',
    },
  }))
}

function convertToFlowEdges(edges: any[]): Edge[] {
  return edges.map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    style: {
      stroke: relationshipColors[e.type] || '#6b7280',
      strokeWidth: Math.max(1, Math.min(4, e.strength * 4)),
      opacity: 0.6 + e.strength * 0.4,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: relationshipColors[e.type] || '#6b7280',
    },
    data: {
      relationshipType: e.type,
      strength: e.strength,
      context: e.context,
    },
  }))
}

export default function NetworkPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [minStrength, setMinStrength] = useState(0.3)

  // Fetch entities for search
  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ['network', 'entities', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/network/entities?${params}`)
      if (!res.ok) throw new Error('Failed to fetch entities')
      return res.json()
    },
    enabled: searchTerm.length > 2,
  })

  // Fetch network graph
  const { data: graphData, isLoading: graphLoading, refetch } = useQuery({
    queryKey: ['network', 'graph', selectedTypes, minStrength],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedTypes.length > 0) {
        params.set('relationship_types', selectedTypes.join(','))
      }
      params.set('min_strength', minStrength.toString())
      params.set('limit', '100')
      const res = await fetch(`/api/network/graph?${params}`)
      if (!res.ok) throw new Error('Failed to fetch graph')
      return res.json()
    },
  })

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Update nodes and edges when graph data changes
  useMemo(() => {
    if (graphData?.nodes && graphData?.edges) {
      const flowNodes = convertToFlowNodes(graphData.nodes)
      const flowEdges = convertToFlowEdges(graphData.edges)
      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  }, [graphData, setNodes, setEdges])

  // Analyze articles mutation
  const analyzeMutation = useMutation({
    mutationFn: async (options: { time_range?: number; cluster_id?: string }) => {
      const res = await fetch('/api/network/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to analyze')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast({
        title: 'Análisis completado',
        description: `${data.entities_stored} entidades, ${data.relationships_detected} relaciones`,
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: 'Error en análisis',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-intel-text flex items-center gap-2">
            <Network className="h-5 w-5 sm:h-6 sm:w-6 text-intel-accent" />
            Link Analysis / Network Analysis
          </h1>
          <p className="text-xs sm:text-sm text-intel-muted mt-1">
            Visualiza relaciones entre entidades geopolíticas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeMutation.mutate({ time_range: 24 })}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Analizar últimas 24h
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="intel-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Filter className="h-4 w-4 text-intel-accent" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-mono text-intel-muted mb-2 block">
                Buscar entidad
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-intel-muted" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              {entitiesLoading && (
                <p className="text-xs text-intel-muted mt-1">Buscando...</p>
              )}
              {entitiesData && entitiesData.entities.length > 0 && (
                <div className="mt-2 space-y-1">
                  {entitiesData.entities.slice(0, 5).map((entity: any) => (
                    <div
                      key={entity.id}
                      className="text-xs text-intel-text p-2 rounded bg-intel-border/30 hover:bg-intel-border/50 cursor-pointer"
                    >
                      {entity.canonical_name || entity.name} ({entity.type})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-mono text-intel-muted mb-2 block">
                Tipos de relación
              </label>
              <Select
                value={selectedTypes.join(',') || 'all'}
                onValueChange={(value) =>
                  setSelectedTypes(value === 'all' ? [] : value.split(','))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {relationshipTypes.map((type: string) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-mono text-intel-muted mb-2 block">
                Fuerza mínima: {minStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={minStrength}
                onChange={(e) => setMinStrength(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph visualization */}
      <Card className="intel-card">
        <CardContent className="p-0">
          <div className="h-[600px] relative">
            {graphLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-intel-accent mx-auto mb-2" />
                  <p className="text-sm text-intel-muted">Cargando red...</p>
                </div>
              </div>
            ) : nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Network className="h-12 w-12 text-intel-muted mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-intel-muted mb-2">No hay datos de red</p>
                  <p className="text-xs text-intel-muted">
                    Analiza artículos para generar relaciones
                  </p>
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#1e1e2e"
                />
                <Controls
                  style={{
                    backgroundColor: '#12121a',
                    borderColor: '#1e1e2e',
                  }}
                />

                {/* Stats panel */}
                {graphData?.stats && (
                  <Panel position="top-right" className="bg-intel-surface/90 backdrop-blur p-3 rounded-lg border border-intel-border">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-intel-accent" />
                        <span className="text-intel-muted">Nodos:</span>
                        <span className="text-intel-text font-mono">{graphData.stats.node_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="h-3 w-3 text-intel-accent" />
                        <span className="text-intel-muted">Relaciones:</span>
                        <span className="text-intel-text font-mono">{graphData.stats.edge_count}</span>
                      </div>
                    </div>
                  </Panel>
                )}

                {/* Legend */}
                <Panel position="bottom-left" className="bg-intel-surface/90 backdrop-blur p-3 rounded-lg border border-intel-border max-w-xs">
                  <p className="text-xs font-mono text-intel-muted mb-2">Tipos de entidad</p>
                  <div className="space-y-1 mb-3">
                    {Object.entries(entityTypeColors).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-intel-text capitalize">{type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-intel-muted mb-2">Tipos de relación</p>
                  <div className="space-y-1">
                    {Object.entries(relationshipColors).slice(0, 6).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-intel-text capitalize">{type.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
