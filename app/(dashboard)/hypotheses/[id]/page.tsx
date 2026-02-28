'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Lightbulb,
  Target,
  CheckCircle,
  XCircle,
  Archive,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Shield,
  Skull,
  RefreshCw,
  Loader2,
  Edit,
  History,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/utils'

export default function HypothesisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, canEdit } = useAuthStore()

  const [newProb, setNewProb] = useState<number | null>(null)
  const [rationale, setRationale] = useState('')
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)

  // Fetch hypothesis
  const { data: hypothesis, isLoading } = useQuery({
    queryKey: ['hypothesis', params.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('hypotheses')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      return data
    },
  })

  // Fetch revisions
  const { data: revisions } = useQuery({
    queryKey: ['hypothesis-revisions', params.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('hypothesis_revisions')
        .select('*, profiles(full_name, email)')
        .eq('hypothesis_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!params.id,
  })

  // Update probability mutation
  const updateProbMutation = useMutation({
    mutationFn: async () => {
      if (!hypothesis || newProb === null || !user?.id) return

      // Create revision
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('hypothesis_revisions').insert({
        hypothesis_id: hypothesis.id,
        user_id: user.id,
        prob_before: hypothesis.prob_current,
        prob_after: newProb,
        rationale,
      })

      // Update hypothesis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('hypotheses')
        .update({ prob_current: newProb })
        .eq('id', hypothesis.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hypothesis', params.id] })
      queryClient.invalidateQueries({ queryKey: ['hypothesis-revisions', params.id] })
      setUpdateDialogOpen(false)
      setRationale('')
      toast({ title: 'Probability updated', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' })
    },
  })

  // Generate red team mutation
  const redTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/hypothesis/red-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: hypothesis?.id,
          title: hypothesis?.title,
          statement: hypothesis?.statement,
          assumptions: hypothesis?.assumptions || [],
        }),
      })

      if (!response.ok) throw new Error('Failed to generate red team analysis')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hypothesis', params.id] })
      toast({ title: 'Red team analysis generated', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' })
    },
  })

  // Generate premortem mutation
  const premortemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/hypothesis/premortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: hypothesis?.id,
          title: hypothesis?.title,
          statement: hypothesis?.statement,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate pre-mortem analysis')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hypothesis', params.id] })
      toast({ title: 'Pre-mortem analysis generated', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' })
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!hypothesis) {
    return (
      <Card className="intel-card max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Lightbulb className="h-16 w-16 text-intel-muted mb-4" />
          <h3 className="text-lg font-medium text-intel-text mb-2">
            Hypothesis not found
          </h3>
          <Button asChild>
            <Link href="/hypotheses">Back to hypotheses</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const probChange = hypothesis.prob_current - hypothesis.prob_initial
  const assumptions = hypothesis.assumptions as string[] || []
  const confirmSignals = hypothesis.confirm_signals as string[] || []
  const falsifySignals = hypothesis.falsify_signals as string[] || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hypotheses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="hypothesis">HYPOTHESIS</Badge>
              <Badge
                variant={
                  hypothesis.status === 'confirmed'
                    ? 'success'
                    : hypothesis.status === 'falsified'
                    ? 'error'
                    : hypothesis.status === 'archived'
                    ? 'outline'
                    : 'info'
                }
              >
                {hypothesis.status.toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-2xl font-mono font-bold text-intel-text">
              {hypothesis.title}
            </h1>
          </div>
        </div>
        {canEdit() && (
          <Button variant="outline" asChild>
            <Link href={`/hypotheses/${hypothesis.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statement */}
          <Card className="intel-card">
            <CardHeader>
              <CardTitle>Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-intel-text/90">{hypothesis.statement}</p>
            </CardContent>
          </Card>

          {/* Assumptions */}
          {assumptions.length > 0 && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle>Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {assumptions.map((assumption: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-intel-text/80">
                      <span className="text-intel-accent font-mono">{i + 1}.</span>
                      {assumption}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="intel-card border-intel-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-intel-text flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Confirmation signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {confirmSignals.map((signal, i) => (
                    <li key={i} className="text-sm text-intel-text/70">
                      • {signal}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="intel-card border-intel-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-intel-text flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Falsification signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {falsifySignals.map((signal: string, i: number) => (
                    <li key={i} className="text-sm text-intel-text/70">
                      • {signal}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Red Team Analysis */}
          <Card className="intel-card border-intel-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-intel-text-dim" />
                  Red team analysis
                </CardTitle>
                {canEdit() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => redTeamMutation.mutate()}
                    disabled={redTeamMutation.isPending}
                  >
                    {redTeamMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hypothesis.red_team_analysis ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-intel-text/80">
                    {hypothesis.red_team_analysis}
                  </p>
                </div>
              ) : (
                <p className="text-intel-muted text-sm">
                  No red team analysis generated yet. Click the refresh button to generate.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pre-mortem Analysis */}
          <Card className="intel-card border-intel-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Skull className="h-5 w-5 text-intel-text-dim" />
                  Pre-mortem analysis
                </CardTitle>
                {canEdit() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => premortemMutation.mutate()}
                    disabled={premortemMutation.isPending}
                  >
                    {premortemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hypothesis.premortem_analysis ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-intel-text/80">
                    {hypothesis.premortem_analysis}
                  </p>
                </div>
              ) : (
                <p className="text-intel-muted text-sm">
                  No pre-mortem analysis generated yet. Click the refresh button to generate.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Probability card */}
          <Card className="intel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current probability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-5xl font-mono font-bold text-intel-text">
                  {hypothesis.prob_current}%
                </div>
                {probChange !== 0 && (
                  <div
                    className="flex items-center justify-center gap-1 mt-2 text-intel-text-dim"
                  >
                    {probChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-mono">
                      {probChange > 0 ? '+' : ''}
                      {probChange}% from initial
                    </span>
                  </div>
                )}
              </div>
              <div className="h-3 rounded-full bg-intel-border overflow-hidden mb-4">
                <div
                  className="h-full rounded-none transition-all bg-intel-text-dim"
                  style={{ width: `${hypothesis.prob_current}%` }}
                />
              </div>

              {canEdit() && hypothesis.status === 'active' && (
                <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" onClick={() => setNewProb(hypothesis.prob_current)}>
                      Update probability
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update probability</DialogTitle>
                      <DialogDescription>
                        Provide a rationale for your update
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>New probability</Label>
                          <span className="font-mono text-lg">{newProb}%</span>
                        </div>
                        <Slider
                          value={[newProb || 50]}
                          onValueChange={([value]) => setNewProb(value)}
                          min={1}
                          max={99}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rationale</Label>
                        <Textarea
                          placeholder="What evidence or reasoning led to this update?"
                          value={rationale}
                          onChange={(e) => setRationale(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => updateProbMutation.mutate()}
                        disabled={!rationale.trim() || updateProbMutation.isPending}
                      >
                        {updateProbMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Update
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="intel-card">
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-intel-muted">Created</span>
                <span className="text-intel-text">
                  {formatDate(hypothesis.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-intel-muted">Last updated</span>
                <span className="text-intel-text">
                  {formatRelativeTime(hypothesis.updated_at)}
                </span>
              </div>
              {hypothesis.next_review_at && (
                <div className="flex items-center justify-between">
                  <span className="text-intel-muted flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Next review
                  </span>
                  <span className="text-amber-400">
                    {formatDate(hypothesis.next_review_at)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revision history */}
          <Card className="intel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Revision history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revisions && revisions.length > 0 ? (
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {revisions.map((revision: any) => (
                      <div
                        key={revision.id}
                        className="p-2 rounded bg-intel-border/30 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono">
                            {revision.prob_before}% → {revision.prob_after}%
                          </span>
                          <span className="text-intel-muted">
                            {formatRelativeTime(revision.created_at)}
                          </span>
                        </div>
                        <p className="text-intel-text/70">{revision.rationale}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-intel-muted text-xs">No revisions yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

