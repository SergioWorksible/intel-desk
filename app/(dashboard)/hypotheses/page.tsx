'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Lightbulb,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
} from 'lucide-react'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type Hypothesis = Database['public']['Tables']['hypotheses']['Row']
type HypothesisStatus = Database['public']['Tables']['hypotheses']['Row']['status']

const statusConfig: Record<HypothesisStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Active', color: 'text-blue-400', icon: Target },
  confirmed: { label: 'Confirmed', color: 'text-emerald-400', icon: CheckCircle },
  falsified: { label: 'Falsified', color: 'text-red-400', icon: XCircle },
  archived: { label: 'Archived', color: 'text-intel-muted', icon: Archive },
}

function HypothesisCard({ hypothesis }: { hypothesis: Hypothesis }) {
  const probChange = hypothesis.prob_current - hypothesis.prob_initial
  const StatusIcon = statusConfig[hypothesis.status].icon

  return (
    <Link href={`/hypotheses/${hypothesis.id}`}>
      <Card className="intel-card hover:border-intel-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="hypothesis">HYPOTHESIS</Badge>
                <Badge
                  variant="outline"
                  className={statusConfig[hypothesis.status].color}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[hypothesis.status].label}
                </Badge>
              </div>
              <h3 className="font-medium text-intel-text">{hypothesis.title}</h3>
            </div>
          </div>

          {/* Statement */}
          <p className="text-sm text-intel-text/80 mb-4 line-clamp-2">
            {hypothesis.statement}
          </p>

          {/* Probability meter */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-intel-muted">Probability</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-intel-text">
                  {hypothesis.prob_current}%
                </span>
                {probChange !== 0 && (
                  <span
                    className={`flex items-center text-xs ${
                      probChange > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {probChange > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {probChange > 0 ? '+' : ''}
                    {probChange}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 rounded-full bg-intel-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  hypothesis.prob_current >= 70
                    ? 'bg-emerald-500'
                    : hypothesis.prob_current >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${hypothesis.prob_current}%` }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-intel-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatRelativeTime(hypothesis.updated_at)}
            </span>
            {hypothesis.next_review_at && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                Review: {formatDate(hypothesis.next_review_at)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function HypothesesPage() {
  const supabase = createClient()
  const { user, canEdit } = useAuthStore()
  const [activeTab, setActiveTab] = useState<HypothesisStatus | 'all'>('active')

  // Fetch hypotheses
  const { data: hypotheses, isLoading } = useQuery({
    queryKey: ['hypotheses'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('hypotheses')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Hypothesis[]
    },
  })

  const filteredHypotheses =
    activeTab === 'all'
      ? hypotheses
      : hypotheses?.filter((h) => h.status === activeTab)

  const stats = hypotheses
    ? {
        total: hypotheses.length,
        active: hypotheses.filter((h) => h.status === 'active').length,
        confirmed: hypotheses.filter((h) => h.status === 'confirmed').length,
        falsified: hypotheses.filter((h) => h.status === 'falsified').length,
        needsReview: hypotheses.filter(
          (h) => h.next_review_at && new Date(h.next_review_at) <= new Date()
        ).length,
      }
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Hypothesis board
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Track and update probabilistic hypotheses with discipline
          </p>
        </div>
        {canEdit() && (
          <Button asChild>
            <Link href="/hypotheses/new">
              <Plus className="mr-2 h-4 w-4" />
              New hypothesis
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-intel-accent" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.total}
                  </p>
                  <p className="text-xs text-intel-muted">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.active}
                  </p>
                  <p className="text-xs text-intel-muted">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.confirmed}
                  </p>
                  <p className="text-xs text-intel-muted">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.falsified}
                  </p>
                  <p className="text-xs text-intel-muted">Falsified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {stats.needsReview > 0 && (
            <Card className="intel-card border-amber-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-2xl font-mono font-bold text-intel-text">
                      {stats.needsReview}
                    </p>
                    <p className="text-xs text-amber-400">Needs review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HypothesisStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="falsified">Falsified</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredHypotheses && filteredHypotheses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHypotheses.map((hypothesis: any) => (
                <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
              ))}
            </div>
          ) : (
            <Card className="intel-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Lightbulb className="h-16 w-16 text-intel-muted mb-4" />
                <h3 className="text-lg font-medium text-intel-text mb-2">
                  No hypotheses found
                </h3>
                <p className="text-sm text-intel-muted text-center max-w-md mb-4">
                  Hypotheses help you track predictions and maintain analytical discipline.
                </p>
                {canEdit() && (
                  <Button asChild>
                    <Link href="/hypotheses/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first hypothesis
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

