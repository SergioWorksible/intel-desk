'use client'

import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Globe,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Newspaper,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { formatDate, formatRelativeTime, getSeverityColor, getConfidenceLevel } from '@/lib/utils'

export default function ClusterDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const clusterId = String((params as any)?.id || '')

  // Fetch cluster
  const { data: cluster, isLoading: clusterLoading } = useQuery({
    queryKey: ['cluster', clusterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('*')
        .eq('id', clusterId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!clusterId,
  })

  // Fetch articles in cluster
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['cluster-articles', clusterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('articles')
        .select('*, sources!source_id(name, type, reputation_base)')
        .eq('cluster_id', clusterId)
        .order('published_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!clusterId,
  })

  const repairMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/clusters/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: clusterId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to repair/enrich cluster')
      }
      return payload as { clusters_created?: number; clusters_updated?: number; relinked?: number }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cluster', clusterId] })
      queryClient.invalidateQueries({ queryKey: ['cluster-articles', clusterId] })
      toast({
        title: 'Cluster actualizado',
        description: `Relinked: ${data.relinked ?? 0}. Updated: ${data.clusters_updated ?? 0}.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error al actualizar cluster',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  if (clusterLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-96" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!cluster) {
    return (
      <Card className="intel-card max-w-5xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Globe className="h-16 w-16 text-intel-muted mb-4" />
          <h3 className="text-lg font-medium text-intel-text mb-2">
            Event not found
          </h3>
          <Button asChild>
            <Link href="/clusters">Back to events</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const confidenceLevel = getConfidenceLevel(cluster.confidence)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clusters">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getSeverityColor(cluster.severity)}>
              Severity: {cluster.severity}
            </Badge>
            <Badge
              variant={
                confidenceLevel === 'high'
                  ? 'success'
                  : confidenceLevel === 'medium'
                  ? 'warning'
                  : 'error'
              }
            >
              Confidence: {cluster.confidence}%
            </Badge>
          </div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            {cluster.canonical_title}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-intel-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatRelativeTime(cluster.updated_at)}
            </span>
            <span>{cluster.article_count} articles</span>
            <span>{cluster.source_count} sources</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => repairMutation.mutate()}
            disabled={repairMutation.isPending || !clusterId}
          >
            {repairMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reparando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reparar / Enriquecer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Countries */}
        <Card className="intel-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-intel-muted">Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cluster.countries.length > 0 ? (
                cluster.countries.map((country: string) => (
                  <Badge key={country} variant="outline">
                    {country}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-intel-muted">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Topics */}
        <Card className="intel-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-intel-muted">Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cluster.topics.length > 0 ? (
                cluster.topics.map((topic: string) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-intel-muted">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time window */}
        <Card className="intel-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-intel-muted">Time window</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-intel-text">
            <p>{formatDate(cluster.window_start)} - {formatDate(cluster.window_end)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {cluster.summary && (
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              What happened
              <Badge variant="fact" className="ml-2">FACTS</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-intel-text/90 leading-relaxed">{cluster.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Sources timeline */}
      <Card className="intel-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-intel-accent" />
              Source timeline
            </CardTitle>
            <span className="text-sm text-intel-muted">
              {articles?.length || 0} articles
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {articlesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : articles && articles.length > 0 ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {articles.map((article: any, index: number) => {
                  const source = article.sources as { name: string; type: string; reputation_base: number } | null
                  return (
                    <div key={article.id}>
                      <div className="flex items-start gap-4">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-intel-accent" />
                          {index < articles.length - 1 && (
                            <div className="w-0.5 flex-1 bg-intel-border mt-2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-intel-text hover:text-intel-accent flex items-center gap-1"
                              >
                                {article.title}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <div className="flex items-center gap-2 mt-1 text-xs text-intel-muted">
                                <span>{source?.name || 'Unknown source'}</span>
                                <span>•</span>
                                <span>
                                  {article.published_at
                                    ? formatRelativeTime(article.published_at)
                                    : 'Unknown date'}
                                </span>
                                {source && (
                                  <>
                                    <span>•</span>
                                    <Badge
                                      variant={
                                        source.reputation_base >= 70
                                          ? 'success'
                                          : source.reputation_base >= 40
                                          ? 'warning'
                                          : 'error'
                                      }
                                      className="text-[10px] px-1 py-0"
                                    >
                                      Rep: {source.reputation_base}
                                    </Badge>
                                  </>
                                )}
                              </div>
                              {article.snippet && (
                                <p className="text-sm text-intel-text/70 mt-2 line-clamp-2">
                                  {article.snippet}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-intel-muted">
              <Newspaper className="h-12 w-12 mb-4 opacity-50" />
              <p>No articles linked to this event</p>
              {cluster.article_count > 0 && (
                <p className="text-xs text-intel-muted mt-2">
                  Este cluster tiene {cluster.article_count} en metadata, pero 0 artículos enlazados. Usa “Reparar / Enriquecer”.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open questions */}
      <Card className="intel-card border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-intel-muted" />
            Open questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-intel-text/80">
            <li className="flex items-start gap-2">
              <span className="text-intel-accent">?</span>
              What are the underlying drivers of this development?
            </li>
            <li className="flex items-start gap-2">
              <span className="text-intel-accent">?</span>
              Are there source disagreements on key facts?
            </li>
            <li className="flex items-start gap-2">
              <span className="text-intel-accent">?</span>
              What follow-on events should we expect in 72 hours?
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href={`/hypotheses/new?cluster=${cluster.id}`}>
            Create hypothesis from this event
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/graphs/new?cluster=${cluster.id}`}>
            Add to causal graph
          </Link>
        </Button>
      </div>
    </div>
  )
}

