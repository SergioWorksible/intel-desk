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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Plus,
  Building2,
  TrendingUp,
  User,
  Landmark,
  Clock,
  ChevronRight,
  Target,
  AlertTriangle,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Database } from '@/types/database'

type Playbook = Database['public']['Tables']['playbooks']['Row']
type PlaybookActor = Database['public']['Tables']['playbooks']['Row']['actor_type']

const actorConfig: Record<PlaybookActor, { label: string; icon: typeof Building2 }> = {
  company: { label: 'Company', icon: Building2 },
  investor: { label: 'Investor', icon: TrendingUp },
  individual: { label: 'Individual', icon: User },
  government: { label: 'Government', icon: Landmark },
}

function PlaybookCard({ playbook }: { playbook: Playbook }) {
  const actor = actorConfig[playbook.actor_type]
  const Icon = actor.icon
  const options = playbook.options as Array<{ name: string }> || []
  const triggers = playbook.triggers as string[] || []

  return (
    <Link href={`/playbooks/${playbook.id}`}>
      <Card className="intel-card hover:border-intel-accent/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intel-border">
                <Icon className="h-5 w-5 text-intel-text" />
              </div>
              <div>
                <h3 className="font-medium text-intel-text">{playbook.title}</h3>
                <Badge variant="outline" className="text-xs mt-1">
                  {actor.label}
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-sm text-intel-text/70 line-clamp-2 mb-4">
            {playbook.objective}
          </p>

          {options.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-mono text-intel-muted uppercase mb-2">Options</p>
              <div className="flex flex-wrap gap-1">
                {options.slice(0, 3).map((opt: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {opt.name || `Option ${String.fromCharCode(65 + i)}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {triggers.length > 0 && (
            <div className="flex items-start gap-2 mb-4 p-2 rounded bg-amber-900/20 border border-amber-700/30">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                {triggers.length} trigger(s) defined
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-intel-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(playbook.updated_at)}
            </span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function PlaybooksPage() {
  const supabase = createClient()
  const { canEdit } = useAuthStore()
  const [activeTab, setActiveTab] = useState<PlaybookActor | 'all'>('all')

  // Fetch playbooks
  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['playbooks'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('playbooks')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Playbook[]
    },
  })

  const filteredPlaybooks =
    activeTab === 'all'
      ? playbooks
      : playbooks?.filter((p) => p.actor_type === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Playbooks
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Action plans for different actor types
          </p>
        </div>
        {canEdit() && (
          <Button asChild>
            <Link href="/playbooks/new">
              <Plus className="mr-2 h-4 w-4" />
              New playbook
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PlaybookActor | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(actorConfig).map(([value, config]) => (
            <TabsTrigger key={value} value={value}>
              <config.icon className="h-4 w-4 mr-1" />
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredPlaybooks && filteredPlaybooks.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {filteredPlaybooks.map((playbook: any) => (
                  <PlaybookCard key={playbook.id} playbook={playbook} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className="intel-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-16 w-16 text-intel-muted mb-4" />
                <h3 className="text-lg font-medium text-intel-text mb-2">
                  No playbooks found
                </h3>
                <p className="text-sm text-intel-muted text-center max-w-md mb-4">
                  Playbooks help you prepare action plans for different scenarios.
                </p>
                {canEdit() && (
                  <Button asChild>
                    <Link href="/playbooks/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first playbook
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

