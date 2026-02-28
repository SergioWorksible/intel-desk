'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  GitBranch,
  Trash2,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

type NodeType = 'event' | 'mechanism' | 'variable' | 'actor' | 'outcome'
type EdgeType = 'causes' | 'correlates' | 'triggers' | 'constrains'

const nodeTypeColors: Record<NodeType, string> = {
  event: '#dc2626',
  mechanism: '#d97706',
  variable: '#2563eb',
  actor: '#16a34a',
  outcome: '#9333ea',
}

const edgeTypeStyles: Record<EdgeType, { stroke: string; strokeDasharray?: string }> = {
  causes: { stroke: '#dc2626' },
  correlates: { stroke: '#2563eb', strokeDasharray: '5,5' },
  triggers: { stroke: '#d97706' },
  constrains: { stroke: '#16a34a', strokeDasharray: '10,5' },
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

export default function NewGraphPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)

  // Node dialog
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeType, setNewNodeType] = useState<NodeType>('event')

  // Edge dialog
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  const [newEdgeType, setNewEdgeType] = useState<EdgeType>('causes')
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([])

  // Fetch clusters for generation
  const { data: clusters } = useQuery({
    queryKey: ['clusters-for-graph'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('id, canonical_title, summary, countries, topics, severity')
        .order('severity', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
  })

  // Generate graph from clusters
  const generateGraphMutation = useMutation({
    mutationFn: async () => {
      if (selectedClusterIds.length === 0) {
        throw new Error('Selecciona al menos un cluster')
      }
      if (selectedClusterIds.length > 6) {
        throw new Error('Máximo 6 clusters permitidos para generar el grafo')
      }

      const response = await fetch('/api/graphs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterIds: selectedClusterIds,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate graph')
      return response.json()
    },
    onSuccess: (data) => {
      const graph = data.graph
      setTitle(graph.title)
      setDescription(graph.description || '')

      // Convert generated nodes to ReactFlow format
      const flowNodes: Node[] = graph.nodes.map((node: any, i: number) => ({
        id: node.id || `node-${i}`,
        type: 'default',
        position: node.position || { x: (i % 4) * 200 + 100, y: Math.floor(i / 4) * 150 + 100 },
        data: {
          label: (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: nodeTypeColors[node.type as NodeType] || '#6b7280' }}
                />
                <span className="font-medium">{node.label}</span>
                {node.temporalOrder && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    #{node.temporalOrder}
                  </Badge>
                )}
              </div>
              {node.description && (
                <p className="text-xs text-intel-muted mt-1">{node.description}</p>
              )}
              {node.context && (
                <p className="text-xs text-intel-accent mt-1 italic">{node.context}</p>
              )}
            </div>
          ),
          nodeType: node.type,
          rawLabel: node.label,
          description: node.description,
          context: node.context,
          temporalOrder: node.temporalOrder,
        },
        style: {
          background: '#12121a',
          border: `2px solid ${nodeTypeColors[node.type as NodeType] || '#6b7280'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#e4e4eb',
          fontSize: '12px',
          minWidth: '200px',
          maxWidth: '300px',
        },
      }))

      // Convert generated edges to ReactFlow format
      const flowEdges: Edge[] = graph.edges.map((edge: any, i: number) => {
        const sourceNode = flowNodes.find(n => n.id === edge.source)
        const targetNode = flowNodes.find(n => n.id === edge.target)
        
        return {
          id: edge.id || `e-${edge.source}-${edge.target}-${i}`,
          source: edge.source,
          target: edge.target,
          type: 'default',
          label: edge.type.toUpperCase(),
          labelStyle: { 
            fill: edgeTypeStyles[edge.type as EdgeType]?.stroke || '#6b7280', 
            fontSize: 11,
            fontWeight: 'bold',
          },
          labelBgStyle: { 
            fill: '#12121a', 
            fillOpacity: 0.9, 
            padding: '2px 6px', 
            borderRadius: '4px',
            border: `1px solid ${edgeTypeStyles[edge.type as EdgeType]?.stroke || '#6b7280'}`,
          },
          style: {
            ...(edgeTypeStyles[edge.type as EdgeType] || { stroke: '#6b7280' }),
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeTypeStyles[edge.type as EdgeType]?.stroke || '#6b7280',
            width: 20,
            height: 20,
          },
          data: { 
            type: edge.type, 
            rationale: edge.rationale,
            sourceLabel: sourceNode?.data.rawLabel || edge.source,
            targetLabel: targetNode?.data.rawLabel || edge.target,
          },
        }
      })

      setNodes(flowNodes)
      setEdges(flowEdges)
      setShowGenerateDialog(false)
      setSelectedClusterIds([])
      toast({
        title: 'Grafo generado',
        description: `Se generaron ${flowNodes.length} nodos y ${flowEdges.length} conexiones.`,
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onConnect = useCallback((connection: Connection) => {
    setPendingConnection(connection)
    setEdgeDialogOpen(true)
  }, [])

  const confirmEdge = () => {
    if (!pendingConnection) return

    const newEdge: Edge = {
      id: `e-${pendingConnection.source}-${pendingConnection.target}`,
      source: pendingConnection.source!,
      target: pendingConnection.target!,
      type: 'default',
      label: newEdgeType,
      labelStyle: { fill: '#e4e4eb', fontSize: 10 },
      labelBgStyle: { fill: '#12121a', fillOpacity: 0.8 },
      style: edgeTypeStyles[newEdgeType as EdgeType] || edgeTypeStyles.causes,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeTypeStyles[newEdgeType as EdgeType]?.stroke || edgeTypeStyles.causes.stroke,
      },
      data: { type: newEdgeType },
    }

    setEdges((eds) => addEdge(newEdge, eds))
    setEdgeDialogOpen(false)
    setPendingConnection(null)
    setNewEdgeType('causes')
  }

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: 250, y: 150 + nodes.length * 80 },
      data: {
        label: (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: nodeTypeColors[newNodeType] }}
            />
            <span>{newNodeLabel}</span>
          </div>
        ),
        nodeType: newNodeType,
        rawLabel: newNodeLabel,
      },
      style: {
        background: '#12121a',
        border: `2px solid ${nodeTypeColors[newNodeType]}`,
        borderRadius: '8px',
        padding: '10px 15px',
        color: '#e4e4eb',
        fontSize: '12px',
      },
    }

    setNodes((nds) => [...nds, newNode])
    setNodeDialogOpen(false)
    setNewNodeLabel('')
    setNewNodeType('event')
  }

  const deleteSelected = () => {
    setNodes((nds) => nds.filter((n) => !n.selected))
    setEdges((eds) => eds.filter((e) => !e.selected))
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      if (!title.trim()) throw new Error('Title is required')

      const nodeData = nodes.map((n: any) => ({
        id: n.id,
        label: n.data.rawLabel,
        type: n.data.nodeType,
        position: n.position,
        description: n.data.description,
        context: n.data.context,
        temporalOrder: n.data.temporalOrder,
      }))

      const edgeData = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.data?.type || 'causes',
        rationale: e.data?.rationale,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('causal_graphs')
        .insert({
          user_id: user.id,
          title,
          description,
          nodes: nodeData,
          edges: edgeData,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast({ title: 'Graph saved', variant: 'success' })
      router.push(`/graphs/${data.id}`)
    },
    onError: (error) => {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/graphs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <Input
              placeholder="Graph title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-mono border-none bg-transparent focus-visible:ring-0 px-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={deleteSelected}
            disabled={!nodes.some((n: any) => n.selected) && !edges.some((e: any) => e.selected)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete selected
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Graph editor */}
      <div className="flex-1 rounded-lg border border-intel-border overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, edge) => {
            setSelectedEdge(edge)
          }}
          onPaneClick={() => setSelectedEdge(null)}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
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

          {/* Top panel */}
          <Panel position="top-left" className="flex gap-2">
            <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="h-4 w-4 mr-1" />
              Generar desde eventos
            </Button>
            <Button size="sm" onClick={() => setNodeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar nodo
            </Button>
          </Panel>

          {/* Legend */}
          <Panel position="bottom-left" className="bg-intel-surface/90 backdrop-blur p-3 rounded-lg border border-intel-border">
            <p className="text-xs font-mono text-intel-muted mb-2">Node types</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(nodeTypeColors).map(([type, color]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: color }} />
                  {type}
                </Badge>
              ))}
            </div>
            <p className="text-xs font-mono text-intel-muted mt-3 mb-2">Edge types</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(edgeTypeStyles).map(([type, style]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  <div
                    className="w-4 h-0.5 mr-1"
                    style={{
                      backgroundColor: style.stroke,
                      ...(style.strokeDasharray && {
                        background: `repeating-linear-gradient(90deg, ${style.stroke}, ${style.stroke} 3px, transparent 3px, transparent 6px)`,
                      }),
                    }}
                  />
                  {type}
                </Badge>
              ))}
            </div>
          </Panel>

          {/* Instructions */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="bg-intel-surface/90 backdrop-blur p-4 rounded-lg border border-intel-border text-center">
              <GitBranch className="h-8 w-8 text-intel-accent mx-auto mb-2" />
              <p className="text-sm text-intel-text mb-1">Start building your causal graph</p>
              <p className="text-xs text-intel-muted">Click &quot;Add node&quot; to create nodes, then drag between them to connect</p>
            </Panel>
          )}

          {/* Edge details panel */}
          {selectedEdge && (
            <Panel position="top-right" className="bg-intel-surface/95 backdrop-blur p-4 rounded-lg border border-intel-border w-80 max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-intel-text">Conexión</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedEdge(null)}
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-intel-muted mb-1">Desde</p>
                    <p className="text-sm font-medium text-intel-text">
                      {selectedEdge.data?.sourceLabel || selectedEdge.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-0.5"
                      style={{
                        backgroundColor: edgeTypeStyles[(selectedEdge.data?.type || 'causes') as EdgeType]?.stroke || edgeTypeStyles.causes.stroke,
                        ...(edgeTypeStyles[(selectedEdge.data?.type || 'causes') as EdgeType]?.strokeDasharray && {
                          background: `repeating-linear-gradient(90deg, ${edgeTypeStyles[(selectedEdge.data?.type || 'causes') as EdgeType]?.stroke || edgeTypeStyles.causes.stroke}, ${edgeTypeStyles[(selectedEdge.data?.type || 'causes') as EdgeType]?.stroke || edgeTypeStyles.causes.stroke} 3px, transparent 3px, transparent 6px)`,
                        }),
                      }}
                    />
                    <Badge variant="outline" className="text-xs">
                      {selectedEdge.data?.type || 'causes'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-intel-muted mb-1">Hacia</p>
                    <p className="text-sm font-medium text-intel-text">
                      {selectedEdge.data?.targetLabel || selectedEdge.target}
                    </p>
                  </div>
                  {selectedEdge.data?.rationale && (
                    <div className="mt-3 pt-3 border-t border-intel-border">
                      <p className="text-xs text-intel-muted mb-2">Explicación</p>
                      <p className="text-sm text-intel-text leading-relaxed">
                        {selectedEdge.data.rationale}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Description */}
      <div className="mt-4">
        <Textarea
          placeholder="Graph description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Add node dialog */}
      <Dialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="e.g., Oil price spike"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as NodeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="mechanism">Mechanism</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                  <SelectItem value="actor">Actor</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addNode} disabled={!newNodeLabel.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add edge dialog */}
      <Dialog open={edgeDialogOpen} onOpenChange={setEdgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define relationship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Relationship type</Label>
              <Select value={newEdgeType} onValueChange={(v) => setNewEdgeType(v as EdgeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="causes">Causes</SelectItem>
                  <SelectItem value="correlates">Correlates with</SelectItem>
                  <SelectItem value="triggers">Triggers</SelectItem>
                  <SelectItem value="constrains">Constrains</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmEdge}>Add connection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate from clusters dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Generar grafo desde eventos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-intel-muted">
              Selecciona los clusters de eventos para generar automáticamente un grafo causal con IA (máximo 6 clusters)
            </p>
            {selectedClusterIds.length > 0 && (
              <div className="text-xs text-intel-accent">
                {selectedClusterIds.length} de 6 clusters seleccionados
              </div>
            )}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {clusters?.map((cluster: any) => (
                <div
                  key={cluster.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedClusterIds.includes(cluster.id)
                      ? 'bg-intel-accent/20 border-intel-accent'
                      : 'bg-intel-border/30 border-intel-border hover:border-intel-accent/50'
                  }`}
                  onClick={() => {
                    if (selectedClusterIds.includes(cluster.id)) {
                      setSelectedClusterIds(selectedClusterIds.filter((id) => id !== cluster.id))
                    } else {
                      if (selectedClusterIds.length >= 6) {
                        toast({
                          title: 'Límite alcanzado',
                          description: 'Máximo 6 clusters permitidos para generar el grafo',
                          variant: 'destructive',
                        })
                        return
                      }
                      setSelectedClusterIds([...selectedClusterIds, cluster.id])
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-intel-text">{cluster.canonical_title}</h4>
                      {cluster.summary && (
                        <p className="text-sm text-intel-muted mt-1 line-clamp-2">{cluster.summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Severidad: {cluster.severity}
                        </Badge>
                        {cluster.countries && cluster.countries.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {cluster.countries.join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedClusterIds.includes(cluster.id)}
                      onChange={() => {
                        if (selectedClusterIds.includes(cluster.id)) {
                          setSelectedClusterIds(selectedClusterIds.filter((id) => id !== cluster.id))
                        } else {
                          if (selectedClusterIds.length >= 6) {
                            toast({
                              title: 'Límite alcanzado',
                              description: 'Máximo 6 clusters permitidos para generar el grafo',
                              variant: 'destructive',
                            })
                            return
                          }
                          setSelectedClusterIds([...selectedClusterIds, cluster.id])
                        }
                      }}
                      disabled={!selectedClusterIds.includes(cluster.id) && selectedClusterIds.length >= 6}
                      className="ml-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => generateGraphMutation.mutate()}
              disabled={selectedClusterIds.length === 0 || selectedClusterIds.length > 6 || generateGraphMutation.isPending}
            >
              {generateGraphMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar grafo ({selectedClusterIds.length} de 6 eventos)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

