'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  TrendingUp,
  User,
  Landmark,
  Target,
  AlertTriangle,
  CheckSquare,
  Clock,
  FileDown,
  Scale,
  ChevronRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type Playbook = Database['public']['Tables']['playbooks']['Row']
type ActorType = Database['public']['Tables']['playbooks']['Row']['actor_type']

const actorIcons: Record<ActorType, typeof Building2> = {
  company: Building2,
  investor: TrendingUp,
  individual: User,
  government: Landmark,
}

const actorLabels: Record<ActorType, string> = {
  company: 'Company',
  investor: 'Investor',
  individual: 'Individual',
  government: 'Government',
}

interface Option {
  name: string
  description: string
  trade_offs: string
}

export default function PlaybookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { canEdit } = useAuthStore()

  const playbookId = params.id as string

  // Fetch playbook
  const { data: playbook, isLoading } = useQuery({
    queryKey: ['playbook', playbookId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('playbooks')
        .select('*')
        .eq('id', playbookId)
        .single()

      if (error) throw error
      return data as Playbook
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('playbooks').delete().eq('id', playbookId)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Playbook deleted' })
      router.push('/playbooks')
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleExport = () => {
    if (!playbook) return

    const options = (playbook.options as unknown as Option[]) || []
    const triggers = (playbook.triggers as string[]) || []
    const checklist = (playbook.checklist as string[]) || []

    const markdown = `# ${playbook.title}

**Actor Type:** ${actorLabels[playbook.actor_type]}
**Last Updated:** ${formatDate(playbook.updated_at)}

## Objective

${playbook.objective}

## Strategic Options

${options.map((opt, i) => `### Option ${String.fromCharCode(65 + i)}: ${opt.name}

${opt.description}

**Trade-offs:** ${opt.trade_offs}`).join('\n\n')}

## Activation Triggers

${triggers.map((t: string) => `- ${t}`).join('\n')}

## Costos de error

${playbook.type_i_cost ? `### Error tipo I (actuar cuando no se debería)\n\n${playbook.type_i_cost}` : ''}
${playbook.type_ii_cost ? `\n\n### Error tipo II (no actuar cuando se debería)\n\n${playbook.type_ii_cost}` : ''}

## Action Checklist

${checklist.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 72-Hour Response Plan

${playbook.response_72h}

---
*Exported from Intel Desk*
`

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `playbook-${playbook.title.toLowerCase().replace(/\s+/g, '-')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-64" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )
  }

  if (!playbook) {
    return (
      <Card className="intel-card max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Target className="h-16 w-16 text-intel-muted mb-4" />
          <h3 className="text-lg font-medium text-intel-text mb-2">
            Playbook not found
          </h3>
          <Button asChild>
            <Link href="/playbooks">Back to playbooks</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const ActorIcon = actorIcons[playbook.actor_type]
  const options = (playbook.options as unknown as Option[]) || []
  const triggers = (playbook.triggers as string[]) || []
  const checklist = (playbook.checklist as string[]) || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/playbooks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-intel-border flex items-center justify-center">
              <ActorIcon className="h-6 w-6 text-intel-text" />
            </div>
            <div>
              <h1 className="text-2xl font-mono font-bold text-intel-text">
                {playbook.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{actorLabels[playbook.actor_type]}</Badge>
                <span className="text-sm text-intel-muted">
                  Updated {formatDate(playbook.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          {canEdit() && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/playbooks/${playbookId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm('Delete this playbook?')) {
                    deleteMutation.mutate()
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Objective */}
      <Card className="intel-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-intel-accent" />
            Objective
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-intel-text">{playbook.objective}</p>
        </CardContent>
      </Card>

      {/* Strategic options */}
      {options.length > 0 && (
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-intel-accent" />
              Strategic options
            </CardTitle>
            <CardDescription>
              {options.length} option{options.length !== 1 ? 's' : ''} defined
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option: any, index: number) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-intel-border/30 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-intel-accent text-white">
                    Option {String.fromCharCode(65 + index)}
                  </Badge>
                  <h4 className="font-medium text-intel-text">{option.name}</h4>
                </div>
                {option.description && (
                  <p className="text-sm text-intel-text/80">{option.description}</p>
                )}
                {option.trade_offs && (
                  <div className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-amber-400 shrink-0">
                      Trade-offs
                    </Badge>
                    <p className="text-intel-muted">{option.trade_offs}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Triggers */}
      {triggers.length > 0 && (
        <Card className="intel-card border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Activation triggers
            </CardTitle>
            <CardDescription>
              Signals that indicate this playbook should be activated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {triggers.map((trigger, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-intel-text"
                >
                  <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
                  {trigger}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cost of being wrong */}
      {(playbook.type_i_cost || playbook.type_ii_cost) && (
        <Card className="intel-card border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Costos de error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {playbook.type_i_cost && (
              <div>
                <h4 className="text-sm font-semibold text-intel-text mb-2">
                  Error tipo I (actuar cuando no se debería)
                </h4>
                <p className="text-intel-text">{playbook.type_i_cost}</p>
              </div>
            )}
            {playbook.type_ii_cost && (
              <div>
                <h4 className="text-sm font-semibold text-intel-text mb-2">
                  Error tipo II (no actuar cuando se debería)
                </h4>
                <p className="text-intel-text">{playbook.type_ii_cost}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-400" />
              Action checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {checklist.map((item: string, index: number) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-sm text-intel-text"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-intel-border text-xs font-mono">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 72h Response */}
      {playbook.response_72h && (
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-intel-accent" />
              72-hour response plan
            </CardTitle>
            <CardDescription>
              Immediate actions for the first 72 hours after activation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-intel-text whitespace-pre-wrap">{playbook.response_72h}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

