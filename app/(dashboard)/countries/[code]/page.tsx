'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Flag,
  MapPin,
  Users,
  Building2,
  Crown,
  Star,
  Clock,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Edit,
} from 'lucide-react'
import { formatRelativeTime, getSeverityColor } from '@/lib/utils'
import { CountryFlag } from '@/components/country-flag'

export default function CountryDetailPage() {
  const params = useParams()
  const code = params.code as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { isAdmin } = useAuthStore()

  // Fetch country
  const { data: country, isLoading: countryLoading } = useQuery({
    queryKey: ['country', code],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('countries')
        .select('*')
        .eq('code', code)
        .single()

      if (error) throw error
      return data
    },
  })

  // Fetch recent clusters for this country
  const { data: clusters, isLoading: clustersLoading } = useQuery({
    queryKey: ['country-clusters', code],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select('*')
        .contains('countries', [code])
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    },
    enabled: !!code,
  })

  // Toggle watchlist mutation
  const watchlistMutation = useMutation({
    mutationFn: async (watchlist: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('countries')
        .update({ watchlist })
        .eq('code', code)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country', code] })
      queryClient.invalidateQueries({ queryKey: ['countries'] })
      toast({
        title: country?.watchlist ? 'Removed from watchlist' : 'Added to watchlist',
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (countryLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 col-span-2" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!country) {
    return (
      <Card className="intel-card max-w-5xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Flag className="h-16 w-16 text-intel-muted mb-4" />
          <h3 className="text-lg font-medium text-intel-text mb-2">
            Country not found
          </h3>
          <Button asChild>
            <Link href="/countries">Back to countries</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const drivers = country.drivers as string[] || []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/countries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <CountryFlag code={country.code} name={country.name} size="lg" />
            <div>
              <h1 className="text-2xl font-mono font-bold text-intel-text">
                {country.name}
              </h1>
              <p className="text-sm text-intel-muted">
                {country.region} • {country.subregion || 'N/A'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Star
              className={`h-5 w-5 ${
                country.watchlist ? 'text-intel-text fill-intel-text-dim' : 'text-intel-muted'
              }`}
            />
            <span className="text-sm text-intel-muted">Watchlist</span>
            <Switch
              checked={country.watchlist}
              onCheckedChange={(checked) => watchlistMutation.mutate(checked)}
              disabled={watchlistMutation.isPending}
            />
          </div>
          {isAdmin() && (
            <Button variant="outline" asChild>
              <Link href={`/countries/${code}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Basic info */}
        <div className="space-y-6">
          {/* Quick facts */}
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="text-base">Quick facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-intel-muted" />
                <div>
                  <p className="text-xs text-intel-muted">Capital</p>
                  <p className="text-intel-text">{country.capital || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-intel-muted" />
                <div>
                  <p className="text-xs text-intel-muted">Population</p>
                  <p className="text-intel-text">
                    {country.population
                      ? `${(country.population / 1e6).toFixed(1)} million`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-intel-muted" />
                <div>
                  <p className="text-xs text-intel-muted">GDP</p>
                  <p className="text-intel-text">
                    {country.gdp_usd
                      ? `$${(Number(country.gdp_usd) / 1e12).toFixed(2)}T`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-intel-muted" />
                <div>
                  <p className="text-xs text-intel-muted">Government</p>
                  <p className="text-intel-text text-sm">
                    {country.government_type || '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leadership */}
          {country.leader_name && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="h-4 w-4 text-intel-text-dim" />
                  Current leadership
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-intel-text font-medium">{country.leader_name}</p>
                {country.leader_title && (
                  <p className="text-sm text-intel-muted">{country.leader_title}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Drivers */}
          {drivers.length > 0 && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base">Key drivers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {drivers.map((driver: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-intel-text/80">
                      <span className="text-intel-accent">•</span>
                      {driver}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Overview and events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          {country.overview && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base">Structural overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-intel-text/90 leading-relaxed whitespace-pre-wrap">
                  {country.overview}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Active risks */}
          <Card className="intel-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-intel-text-dim" />
                  Active events
                </CardTitle>
                <span className="text-sm text-intel-muted">
                  {clusters?.length || 0} recent
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {clustersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : clusters && clusters.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {clusters.map((cluster: any) => (
                      <Link key={cluster.id} href={`/clusters/${cluster.id}`}>
                        <div className="p-4 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h4 className="font-medium text-intel-text line-clamp-2">
                              {cluster.canonical_title}
                            </h4>
                            <Badge className={getSeverityColor(cluster.severity)}>
                              {cluster.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-intel-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(cluster.updated_at)}
                            </span>
                            <span>{cluster.article_count} articles</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-intel-muted">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No recent events for this country</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


