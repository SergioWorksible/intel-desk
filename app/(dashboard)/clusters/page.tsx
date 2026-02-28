'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Globe,
  Search,
  Clock,
  ExternalLink,
  Filter,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { formatRelativeTime, getSeverityColor, getConfidenceLevel } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

type Cluster = Database['public']['Tables']['clusters']['Row']

function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <Link href={`/clusters/${cluster.id}`}>
      <Card className="intel-card hover:border-intel-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-intel-text line-clamp-2 mb-2">
                {cluster.canonical_title}
              </h3>
              <div className="flex flex-wrap gap-1">
                {cluster.countries.slice(0, 3).map((country: string) => (
                  <Badge key={country} variant="outline" className="text-xs">
                    {country}
                  </Badge>
                ))}
                {cluster.countries.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{cluster.countries.length - 3}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getSeverityColor(cluster.severity)}>
                {cluster.severity >= 70 ? 'HIGH' : cluster.severity >= 40 ? 'MED' : 'LOW'}
              </Badge>
              <span
                className={`text-xs font-mono ${
                  getConfidenceLevel(cluster.confidence) === 'high'
                    ? 'text-emerald-400'
                    : getConfidenceLevel(cluster.confidence) === 'medium'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {cluster.confidence}%
              </span>
            </div>
          </div>

          {/* Summary */}
          {cluster.summary && (
            <p className="text-sm text-intel-text/70 line-clamp-2 mb-3">
              {cluster.summary}
            </p>
          )}

          {/* Topics */}
          {cluster.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {cluster.topics.slice(0, 4).map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-intel-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(cluster.updated_at)}
              </span>
              <span>{cluster.article_count} articles</span>
              <span>{cluster.source_count} sources</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ClustersPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [isReclustering, setIsReclustering] = useState(false)

  // Fetch clusters
  const { data: clusters, isLoading } = useQuery({
    queryKey: ['clusters'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data as Cluster[]
    },
  })

  // Fetch total count (sin límite)
  const { data: totalCount } = useQuery({
    queryKey: ['clusters-count'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count, error } = await (supabase as any)
        .from('clusters')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count as number
    },
  })

  // Fetch total articles in clusters
  const { data: totalArticles } = useQuery({
    queryKey: ['clusters-total-articles'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('article_count')

      if (error) throw error
      const total = (data as Array<{ article_count: number }>).reduce(
        (sum, c) => sum + (c.article_count || 0),
        0
      )
      return total
    },
  })

  // Reset and recluster function
  const handleResetAndRecluster = async () => {
    if (!confirm('⚠️ Esto borrará TODOS los clusters y los recalculará con ML.\n\n¿Continuar?')) {
      return
    }

    setIsReclustering(true)
    toast({
      title: 'Reclustering iniciado',
      description: 'Esto puede tardar varios minutos...',
    })

    try {
      const response = await fetch('http://localhost:5001/api/recluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: 30,
          limit: 1000,
          reset_first: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error en reclustering')
      }

      const result = await response.json()

      toast({
        title: 'Reclustering completado',
        description: `${result.created} clusters creados, ${result.processed} artículos procesados`,
      })

      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['clusters-count'] })
      queryClient.invalidateQueries({ queryKey: ['clusters-total-articles'] })
    } catch (error) {
      console.error('Reclustering error:', error)
      toast({
        title: 'Error en reclustering',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsReclustering(false)
    }
  }

  // Get unique topics for filter
  const allTopics = clusters
    ? Array.from(new Set(clusters.flatMap((c: any) => c.topics))).sort()
    : []

  // Filter clusters
  const filteredClusters = clusters?.filter((cluster: any) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      if (
        !cluster.canonical_title.toLowerCase().includes(searchLower) &&
        !cluster.countries.some((c: string) => c.toLowerCase().includes(searchLower)) &&
        !cluster.topics.some((t: string) => t.toLowerCase().includes(searchLower))
      ) {
        return false
      }
    }

    // Severity filter
    if (severityFilter !== 'all') {
      if (severityFilter === 'high' && cluster.severity < 70) return false
      if (severityFilter === 'medium' && (cluster.severity < 40 || cluster.severity >= 70)) return false
      if (severityFilter === 'low' && cluster.severity >= 40) return false
    }

    // Topic filter
    if (topicFilter !== 'all' && !cluster.topics.includes(topicFilter)) {
      return false
    }

    return true
  })

  const stats = clusters
    ? {
        total: totalCount ?? clusters.length, // Usar totalCount si está disponible
        totalArticles: totalArticles ?? clusters.reduce((sum: number, c: any) => sum + (c.article_count || 0), 0),
        high: clusters.filter((c: any) => c.severity >= 70).length,
        medium: clusters.filter((c: any) => c.severity >= 40 && c.severity < 70).length,
        low: clusters.filter((c: any) => c.severity < 40).length,
      }
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Event clusters
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Grouped intelligence events from multiple sources
          </p>
        </div>
        {/* TEMPORAL: Botón de reset y reclustering */}
        <Button
          onClick={handleResetAndRecluster}
          disabled={isReclustering}
          variant="outline"
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
        >
          {isReclustering ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Reclustering...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Reset & Recluster ML
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-intel-accent" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.total}
                  </p>
                  <p className="text-xs text-intel-muted">Total clusters</p>
                  {stats.totalArticles > 0 && (
                    <p className="text-xs text-intel-muted/70 mt-1">
                      {stats.totalArticles} articles
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card border-red-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.high}
                  </p>
                  <p className="text-xs text-red-400">High severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card border-amber-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.medium}
                  </p>
                  <p className="text-xs text-amber-400">Medium severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card border-emerald-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.low}
                  </p>
                  <p className="text-xs text-emerald-400">Low severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-intel-muted" />
          <Input
            placeholder="Search events, countries, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {allTopics.map((topic: string) => (
              <SelectItem key={topic} value={topic}>
                {topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clusters list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredClusters && filteredClusters.length > 0 ? (
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
            {filteredClusters.map((cluster: any) => (
              <ClusterCard key={cluster.id} cluster={cluster} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-16 w-16 text-intel-muted mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              No events found
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md">
              {search || severityFilter !== 'all' || topicFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Events will appear here as they are ingested'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

