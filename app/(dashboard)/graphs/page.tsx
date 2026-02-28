'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import {
  GitBranch,
  Plus,
  Clock,
  ChevronRight,
  Circle,
  Network,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Database } from '@/types/database'

type CausalGraph = Database['public']['Tables']['causal_graphs']['Row']

function GraphCard({ graph }: { graph: CausalGraph }) {
  const nodes = graph.nodes as Array<{ id: string; type: string }> || []
  const edges = graph.edges as Array<{ source: string; target: string }> || []

  const nodeTypes: Record<string, number> = nodes.reduce((acc: Record<string, number>, node: any) => {
    acc[node.type] = (acc[node.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Link href={`/graphs/${graph.id}`}>
      <Card className="intel-card hover:border-intel-accent/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intel-border">
                <Network className="h-5 w-5 text-intel-accent" />
              </div>
              <div>
                <h3 className="font-medium text-intel-text">{graph.title}</h3>
                <p className="text-xs text-intel-muted">
                  {nodes.length} nodes • {edges.length} edges
                </p>
              </div>
            </div>
          </div>

          {graph.description && (
            <p className="text-sm text-intel-text/70 line-clamp-2 mb-4">
              {graph.description}
            </p>
          )}

          {/* Node type breakdown */}
          {Object.keys(nodeTypes).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {Object.entries(nodeTypes).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {count as number} {type}
                </Badge>
              ))}
            </div>
          )}

          {/* Linked clusters */}
          {graph.linked_cluster_ids.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-intel-muted">
                Linked to {graph.linked_cluster_ids.length} event(s)
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-intel-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(graph.updated_at)}
            </span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function GraphsPage() {
  const supabase = createClient()
  const { canEdit } = useAuthStore()

  // Fetch graphs
  const { data: graphs, isLoading } = useQuery({
    queryKey: ['causal-graphs'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('causal_graphs')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as CausalGraph[]
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Causal graphs
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Map causal relationships between events, actors, and outcomes
          </p>
        </div>
        {canEdit() && (
          <Button asChild>
            <Link href="/graphs/new">
              <Plus className="mr-2 h-4 w-4" />
              New graph
            </Link>
          </Button>
        )}
      </div>

      {/* Graph list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : graphs && graphs.length > 0 ? (
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {graphs.map((graph: any) => (
              <GraphCard key={graph.id} graph={graph} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="h-16 w-16 text-intel-muted mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              No causal graphs yet
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md mb-4">
              Causal graphs help you visualize relationships between events, actors, and outcomes.
            </p>
            {canEdit() && (
              <Button asChild>
                <Link href="/graphs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first graph
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

