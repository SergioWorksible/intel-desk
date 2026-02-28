'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Newspaper,
  Search,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  Database as DatabaseIcon,
  Link2,
  RefreshCw,
  Loader2,
  ChevronRight,
  Download,
  AlertTriangle,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Database } from '@/types/database'

type Article = Database['public']['Tables']['articles']['Row'] & {
  sources?: { name: string; type: string; reputation_base: number } | null
}

function ArticleFeedItem({ article }: { article: Article }) {
  const source = article.sources as { name: string; type: string; reputation_base: number } | null
  const [expanded, setExpanded] = useState(false)
  const snippet = article.snippet || article.full_content?.substring(0, 150) || ''

  return (
    <div className="group hover:bg-intel-border/30 transition-colors rounded-lg p-3 -mx-3">
      <div className="flex items-start gap-3">
        {/* Bullet point */}
        <div className="flex-shrink-0 mt-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-intel-accent/60 group-hover:bg-intel-accent" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Title - clickable */}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <h3 className="text-sm font-medium text-intel-text hover:text-intel-accent transition-colors line-clamp-2 mb-1">
                  {article.title}
                </h3>
              </a>
              
              {/* Source and time */}
              <div className="flex items-center gap-2 text-xs text-intel-muted mb-1">
                {source && (
                  <span className="font-mono">{source.name}</span>
                )}
                {article.published_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(article.published_at)}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="text-intel-muted/70">{article.domain}</span>
              </div>
              
              {/* Snippet - expandable */}
              {snippet && (
                <div className="mt-1">
                  <p className={`text-xs text-intel-text/70 leading-relaxed ${
                    expanded ? '' : 'line-clamp-1'
                  }`}>
                    {snippet}
                  </p>
                  {snippet.length > 150 && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-xs text-intel-accent hover:text-intel-accent/80 mt-1"
                    >
                      {expanded ? 'less' : 'more'}
                    </button>
                  )}
                </div>
              )}
              
              {/* Tags - compact */}
              {(article.countries.length > 0 || article.topics.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {article.countries.slice(0, 2).map((country: string) => (
                    <Badge key={country} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {country}
                    </Badge>
                  ))}
                  {article.countries.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      +{article.countries.length - 2}
                    </Badge>
                  )}
                  {article.topics.slice(0, 2).map((topic: string) => (
                    <Badge key={topic} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* External link icon */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-3.5 w-3.5 text-intel-muted hover:text-intel-accent" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ArticlesPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [clusteredFilter, setClusteredFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [manualRefreshPending, setManualRefreshPending] = useState(false)

  // Debug: Log component mount
  useEffect(() => {
    console.log('ArticlesPage mounted', { supabase: !!supabase, queryClient: !!queryClient })
  }, [supabase, queryClient])

  // Fetch articles count (total real)
  const { data: articlesCount } = useQuery({
    queryKey: ['articles-count', dateFilter],
    queryFn: async (): Promise<{ total: number; clustered: number; unclustered: number; today: number }> => {
      // Build date filter
      let dateFilterCondition: { gte?: string } = {}
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate: Date
        if (dateFilter === 'today') {
          startDate = new Date(now.setHours(0, 0, 0, 0))
        } else if (dateFilter === 'week') {
          startDate = new Date(now.setDate(now.getDate() - 7))
        } else {
          startDate = new Date(now.setMonth(now.getMonth() - 1))
        }
        dateFilterCondition = { gte: startDate.toISOString() }
      }

      // Get total count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let totalQuery = (supabase as any)
        .from('articles')
        .select('*', { count: 'exact', head: true })

      if (dateFilterCondition.gte) {
        totalQuery = totalQuery.gte('published_at', dateFilterCondition.gte)
      }

      const { count: total, error: countError } = await totalQuery

      if (countError) {
        console.error('Error fetching articles count:', countError)
        throw countError
      }

      // Get clustered count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let clusteredQuery = (supabase as any)
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .not('cluster_id', 'is', null)

      if (dateFilterCondition.gte) {
        clusteredQuery = clusteredQuery.gte('published_at', dateFilterCondition.gte)
      }

      const { count: clustered, error: clusteredError } = await clusteredQuery

      if (clusteredError) {
        console.error('Error fetching clustered count:', clusteredError)
        // Don't throw, just use 0
      }

      // Get today count (always, regardless of dateFilter)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: todayCount, error: todayError } = await (supabase as any)
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .gte('published_at', today.toISOString())
        .lt('published_at', tomorrow.toISOString())

      if (todayError) {
        console.error('Error fetching today count:', todayError)
        // Don't throw, just use 0
      }

      return {
        total: total || 0,
        clustered: clustered || 0,
        unclustered: (total || 0) - (clustered || 0),
        today: todayCount || 0,
      }
    },
    enabled: true,
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds
  })

  // Fetch articles
  const { data: articles, isLoading, isFetching, error: articlesError, refetch } = useQuery({
    queryKey: ['articles', dateFilter],
    queryFn: async (): Promise<Article[]> => {
      console.log('Query function executing - Fetching articles from Supabase...', { dateFilter })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('articles')
        .select('*, sources!source_id(name, type, reputation_base)')
        .order('published_at', { ascending: false })
        .limit(500)

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate: Date
        if (dateFilter === 'today') {
          startDate = new Date(now.setHours(0, 0, 0, 0))
        } else if (dateFilter === 'week') {
          startDate = new Date(now.setDate(now.getDate() - 7))
        } else {
          startDate = new Date(now.setMonth(now.getMonth() - 1))
        }
        query = query.gte('published_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching articles:', error)
        throw error
      }
      
      console.log(`Fetched ${data?.length || 0} articles`)
      return (data || []) as Article[]
    },
    enabled: true, // Explicitly enable the query
    retry: 2, // Retry on failure
    staleTime: 0, // Always consider data stale to ensure fresh fetch
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus (already disabled globally)
  })

  // Auto-ingest new articles every minute
  const ingestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cron/ingest', {
        method: 'POST',
        headers: { 'x-manual-trigger': 'true' },
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to ingest')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      if (data.results?.articles_new > 0) {
        toast({
          title: 'Nuevas noticias obtenidas',
          description: `${data.results.articles_new} artículos nuevos`,
        })
      }
    },
    onError: (error) => {
      console.error('Auto-ingest error:', error)
      // Silently fail for auto-ingest
    },
  })

  // Auto-ingest removed - only manual trigger via button

  // Re-analyze mutation
  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/clusters/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to re-analyze')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['articles-count'] })
      toast({
        title: 'Re-análisis completado',
        description: `Creados ${data.clusters_created || 0} clusters, actualizados ${data.clusters_updated || 0}`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error en re-análisis',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  // Cluster unclustered articles mutation
  const clusterMutation = useMutation({
    mutationFn: async (options?: { days?: number; limit?: number }) => {
      const response = await fetch('/api/clusters/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || { days: 7, limit: 500 }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cluster articles')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['articles-count'] })
      const method = data.method === 'ml' ? 'ML (Python)' : 'básico'
      toast({
        title: `Clustering ${method} completado`,
        description: `Creados ${data.clusters_created || 0} clusters, actualizados ${data.clusters_updated || 0}. Procesados ${data.articles_processed || 0} artículos.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error en clustering',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  // Auto-refresh articles while ingest is running
  useEffect(() => {
    if (!ingestMutation.isPending) return

    const interval = setInterval(() => {
      refetch()
    }, 3000) // Refresh every 3 seconds while ingesting

    return () => clearInterval(interval)
  }, [ingestMutation.isPending, refetch])

  const headerStatus =
    ingestMutation.isPending
      ? 'Obteniendo...'
      : reanalyzeMutation.isPending
        ? 'Re-analizando...'
        : clusterMutation.isPending
          ? 'Clusterizando...'
          : manualRefreshPending
            ? 'Actualizando...'
            : null

  const isBusy = ingestMutation.isPending || reanalyzeMutation.isPending || clusterMutation.isPending || manualRefreshPending

  // Fetch sources for filter
  const { data: sources } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sources')
        .select('id, name')
        .eq('enabled', true)
        .order('name')

      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })


  // Filter articles
  const filteredArticles = articles?.filter((article: any) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      if (
        !article.title.toLowerCase().includes(searchLower) &&
        !article.snippet?.toLowerCase().includes(searchLower) &&
        !article.countries.some((c: string) => c.toLowerCase().includes(searchLower)) &&
        !article.topics.some((t: string) => t.toLowerCase().includes(searchLower))
      ) {
        return false
      }
    }

    // Source filter
    if (sourceFilter !== 'all' && article.source_id !== sourceFilter) {
      return false
    }

    // Clustered filter
    if (clusteredFilter === 'yes' && !article.cluster_id) return false
    if (clusteredFilter === 'no' && article.cluster_id) return false

    return true
  })

  // Use real count from database if available, otherwise fallback to loaded articles
  const stats = articlesCount
    ? articlesCount
    : articles
      ? {
          total: articles.length,
          clustered: articles.filter((a) => a.cluster_id).length,
          unclustered: articles.filter((a) => !a.cluster_id).length,
          today: articles.filter((a) => {
            if (!a.published_at) return false
            const articleDate = new Date(a.published_at)
            const today = new Date()
            return (
              articleDate.getDate() === today.getDate() &&
              articleDate.getMonth() === today.getMonth() &&
              articleDate.getFullYear() === today.getFullYear()
            )
          }).length,
        }
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Articles
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            All ingested articles from RSS feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerStatus && (
            <div className="flex items-center gap-2 text-xs text-intel-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{headerStatus}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (isBusy) return
              setManualRefreshPending(true)
              try {
                await refetch()
              } finally {
                setManualRefreshPending(false)
              }
            }}
            disabled={isBusy}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => ingestMutation.mutate()}
            disabled={isBusy}
          >
            <Download className="h-4 w-4 mr-2" />
            Obtener artículos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reanalyzeMutation.mutate()
              queryClient.invalidateQueries({ queryKey: ['articles'] })
            }}
            disabled={isBusy}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-analizar con IA
          </Button>
          {stats && stats.unclustered > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => clusterMutation.mutate({ days: 7, limit: 500 })}
              disabled={isBusy}
              className="bg-intel-accent hover:bg-intel-accent/80 text-intel-bg"
            >
              {clusterMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clusterizando...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Clusterizar ({stats.unclustered})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Newspaper className="h-5 w-5 text-intel-accent" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.total}
                  </p>
                  <p className="text-xs text-intel-muted">Total articles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card border-emerald-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DatabaseIcon className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.clustered}
                  </p>
                  <p className="text-xs text-emerald-400">Clustered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card border-amber-900/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-2xl font-mono font-bold text-intel-text">
                      {stats.unclustered}
                    </p>
                    <p className="text-xs text-amber-400">Unclustered</p>
                  </div>
                </div>
                {stats.unclustered > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clusterMutation.mutate({ days: 7, limit: 500 })}
                    disabled={isBusy}
                    className="h-8 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    title="Clusterizar artículos sin cluster"
                  >
                    <Link2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card border-blue-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.today}
                  </p>
                  <p className="text-xs text-blue-400">Today</p>
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
            placeholder="Search articles, countries, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last week</SelectItem>
            <SelectItem value="month">Last month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources?.map((source: any) => (
              <SelectItem key={source.id} value={source.id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clusteredFilter} onValueChange={(v) => setClusteredFilter(v as typeof clusteredFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All articles</SelectItem>
            <SelectItem value="yes">Clustered</SelectItem>
            <SelectItem value="no">Unclustered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Articles feed - compact bullet list */}
      {articlesError ? (
        <Card className="intel-card border-red-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              Error loading articles
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md mb-4">
              {articlesError instanceof Error ? articlesError.message : 'Unknown error'}
            </p>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['articles'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading && !articles ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredArticles && filteredArticles.length > 0 ? (
        <Card className="intel-card">
          <CardContent className="p-4">
            <div className="space-y-1">
              {filteredArticles.map((article: any) => (
                <ArticleFeedItem key={article.id} article={article} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Newspaper className="h-16 w-16 text-intel-muted mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              No articles found
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md">
              {search || sourceFilter !== 'all' || dateFilter !== 'all' || clusteredFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Articles will appear here as they are ingested from RSS feeds'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

