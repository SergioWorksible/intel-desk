'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Skeleton } from '@/components/ui/skeleton'
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
  Edit,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database'

type CausalGraph = Database['public']['Tables']['causal_graphs']['Row']
type NodeType = 'event' | 'mechanism' | 'variable' | 'actor' | 'outcome'
type EdgeType = 'causes' | 'correlates' | 'triggers' | 'constrains'

interface SavedNode {
  id: string
  label: string
  type: NodeType
  position: { x: number; y: number }
  description?: string
  context?: string
  temporalOrder?: number
}

interface SavedEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  rationale?: string
}

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

function convertToFlowNodes(savedNodes: SavedNode[]): Node[] {
  return savedNodes.map((n: any) => ({
    id: n.id,
    type: 'default',
    position: n.position,
    data: {
      label: (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: nodeTypeColors[n.type as NodeType] || '#6b7280' }}
            />
            <span className="font-medium">{n.label}</span>
            {n.temporalOrder && (
              <Badge variant="outline" className="text-xs ml-auto">
                #{n.temporalOrder}
              </Badge>
            )}
          </div>
          {n.description && (
            <p className="text-xs text-intel-muted mt-1">{n.description}</p>
          )}
          {n.context && (
            <p className="text-xs text-intel-accent mt-1 italic">{n.context}</p>
          )}
        </div>
      ),
      nodeType: n.type,
      rawLabel: n.label,
      description: n.description,
      context: n.context,
      temporalOrder: n.temporalOrder,
    },
    style: {
      background: '#12121a',
      border: `2px solid ${nodeTypeColors[n.type as NodeType] || '#6b7280'}`,
      borderRadius: '8px',
      padding: '12px 16px',
      color: '#e4e4eb',
      fontSize: '12px',
      minWidth: '200px',
      maxWidth: '300px',
    },
  }))
}

function convertToFlowEdges(savedEdges: SavedEdge[], savedNodes: SavedNode[]): Edge[] {
  return savedEdges.map((e: any) => {
    const sourceNode = savedNodes.find((n: any) => n.id === e.source)
    const targetNode = savedNodes.find((n: any) => n.id === e.target)
    
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'default',
      label: e.type.toUpperCase(),
      labelStyle: { 
        fill: edgeTypeStyles[e.type as EdgeType]?.stroke || '#6b7280', 
        fontSize: 11,
        fontWeight: 'bold',
      },
      labelBgStyle: { 
        fill: '#12121a', 
        fillOpacity: 0.9, 
        padding: '2px 6px', 
        borderRadius: '4px',
        border: `1px solid ${edgeTypeStyles[e.type as EdgeType]?.stroke || '#6b7280'}`,
      },
      style: {
        ...(edgeTypeStyles[e.type as EdgeType] || { stroke: '#6b7280' }),
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeTypeStyles[e.type as EdgeType]?.stroke || '#6b7280',
        width: 20,
        height: 20,
      },
      data: { 
        type: e.type, 
        rationale: e.rationale,
        sourceLabel: sourceNode?.label || e.source,
        targetLabel: targetNode?.label || e.target,
      },
    }
  })
}

export default function GraphDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { canEdit } = useAuthStore()

  const graphId = params.id as string
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)

  // Node dialog
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeType, setNewNodeType] = useState<NodeType>('event')

  // Edge dialog
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  const [newEdgeType, setNewEdgeType] = useState<EdgeType>('causes')

  // Fetch graph
  const { data: graph, isLoading } = useQuery({
    queryKey: ['causal-graph', graphId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('causal_graphs')
        .select('*')
        .eq('id', graphId)
        .single()

      if (error) throw error
      return data as CausalGraph
    },
  })

  // Initialize state from graph
  useEffect(() => {
    if (graph) {
      setTitle(graph.title)
      setDescription(graph.description || '')
      const savedNodes = (graph.nodes as unknown as SavedNode[]) || []
      const savedEdges = (graph.edges as unknown as SavedEdge[]) || []
      setNodes(convertToFlowNodes(savedNodes))
      setEdges(convertToFlowEdges(savedEdges, savedNodes))
    }
  }, [graph, setNodes, setEdges])

  const onConnect = useCallback((connection: Connection) => {
    if (!isEditing) return
    setPendingConnection(connection)
    setEdgeDialogOpen(true)
  }, [isEditing])

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
      if (!title.trim()) throw new Error('Title is required')

      const nodeData = nodes.map((n) => ({
        id: n.id,
        label: n.data.rawLabel,
        type: n.data.nodeType,
        position: n.position,
        description: n.data.description,
        context: n.data.context,
        temporalOrder: n.data.temporalOrder,
      }))

      const edgeData = edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.data?.type || 'causes',
        rationale: e.data?.rationale,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('causal_graphs')
        .update({
          title,
          description,
          nodes: nodeData,
          edges: edgeData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', graphId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['causal-graph', graphId] })
      setIsEditing(false)
      toast({ title: 'Graph saved' })
    },
    onError: (error) => {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('causal_graphs').delete().eq('id', graphId)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Graph deleted' })
      router.push('/graphs')
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="flex-1" />
      </div>
    )
  }

  if (!graph) {
    return (
      <Card className="intel-card max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <GitBranch className="h-16 w-16 text-intel-muted mb-4" />
          <h3 className="text-lg font-medium text-intel-text mb-2">
            Graph not found
          </h3>
          <Button asChild>
            <Link href="/graphs">Back to graphs</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

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
            {isEditing ? (
              <Input
                placeholder="Graph title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-mono border-none bg-transparent focus-visible:ring-0 px-0"
              />
            ) : (
              <h1 className="text-xl font-mono font-bold text-intel-text">
                {graph.title}
              </h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={deleteSelected}
                disabled={!nodes.some((n: any) => n.selected) && !edges.some((e: any) => e.selected)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete selected
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !title.trim()}
                className="bg-intel-accent hover:bg-intel-accent/80"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              {canEdit() && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-intel-text-dim hover:text-intel-text hover:bg-intel-border"
                    onClick={() => {
                      if (confirm('Delete this graph?')) {
                        deleteMutation.mutate()
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mode indicator */}
      {!isEditing && (
        <div className="flex items-center gap-2 mb-2 text-sm text-intel-muted">
          <Eye className="h-4 w-4" />
          View mode — click Edit to modify the graph
        </div>
      )}

      {/* Graph editor */}
      <div className="flex-1 rounded-lg border border-intel-border overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isEditing ? onNodesChange : undefined}
          onEdgesChange={isEditing ? onEdgesChange : undefined}
          onConnect={onConnect}
          onEdgeClick={(_, edge) => {
            setSelectedEdge(edge)
          }}
          onPaneClick={() => setSelectedEdge(null)}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          nodesDraggable={isEditing}
          nodesConnectable={isEditing}
          elementsSelectable={isEditing}
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
          {isEditing && (
            <Panel position="top-left" className="flex gap-2">
              <Button size="sm" onClick={() => setNodeDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add node
              </Button>
            </Panel>
          )}

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

          {/* Stats */}
          <Panel position="top-right" className="bg-intel-surface/90 backdrop-blur p-3 rounded-lg border border-intel-border">
            <p className="text-xs font-mono text-intel-text">
              {nodes.length} nodes • {edges.length} edges
            </p>
          </Panel>

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
      {(isEditing || graph.description) && (
        <div className="mt-4">
          {isEditing ? (
            <Textarea
              placeholder="Graph description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          ) : (
            graph.description && (
              <p className="text-sm text-intel-muted">{graph.description}</p>
            )
          )}
        </div>
      )}

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
    </div>
  )
}

