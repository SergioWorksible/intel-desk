'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Newspaper,
  Clock,
  Download,
  Pin,
  EyeOff,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  Calendar,
  ExternalLink,
  FileText,
  FileDown,
} from 'lucide-react'
import { formatDate, formatRelativeTime, calculateReadingTime, getConfidenceLevel } from '@/lib/utils'
import {
  exportBriefingToMarkdown,
  exportBriefingToPdf,
  downloadBlob,
} from '@/lib/briefing-export'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface BriefingItem {
  title: string
  fact: string
  citations: { source: string; url: string }[]
  why_it_matters: string
  signals_72h: string[]
  confidence: number
  topics: string[]
  countries: string[]
}

interface BriefingInteraction {
  action: 'pin' | 'hide' | 'read'
  item_index: number
}

function BriefingItemCard({
  item,
  index,
  onPin,
  onHide,
  isPinned,
  isHidden,
}: {
  item: BriefingItem
  index: number
  onPin: () => void
  onHide: () => void
  isPinned: boolean
  isHidden: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const confidenceLevel = getConfidenceLevel(item.confidence)

  if (isHidden) return null

  return (
    <Card className={`intel-card ${isPinned ? 'ring-1 ring-intel-accent' : ''}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-intel-accent/20 text-intel-accent font-mono text-sm">
              {index + 1}
            </span>
            <div>
              <h3 className="font-medium text-intel-text">{item.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {item.countries.slice(0, 2).map((country: string) => (
                  <Badge key={country} variant="outline" className="text-xs">
                    {country}
                  </Badge>
                ))}
                {item.topics.slice(0, 2).map((topic: string) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPin}
              className={isPinned ? 'text-intel-accent' : ''}
            >
              <Pin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onHide}>
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Fact with FACT badge */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="fact">FACT</Badge>
            <span
              className={`text-xs font-mono ${
                confidenceLevel === 'high'
                  ? 'text-emerald-400'
                  : confidenceLevel === 'medium'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {item.confidence}% confidence
            </span>
          </div>
          <p className="text-sm text-intel-text/90 leading-relaxed">{item.fact}</p>
          {item.citations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {item.citations.map((citation: { source: string; url: string }, i: number) => (
                <a
                  key={i}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="citation"
                >
                  [{i + 1}] {citation.source}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Expandable section */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <span>Analysis & signals</span>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </Button>

        {expanded && (
          <div className="mt-4 space-y-4 pt-4 border-t border-intel-border">
            {/* Why it matters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="inference">INFERENCE</Badge>
              </div>
              <p className="text-sm text-intel-text/80">{item.why_it_matters}</p>
            </div>

            {/* 72h signals */}
            <div>
              <p className="text-xs font-mono uppercase text-intel-muted mb-2">
                72h signals to watch
              </p>
              <ul className="space-y-1">
                {item.signals_72h.map((signal: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-intel-text/70">
                    <span className="text-intel-accent">→</span>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function BriefingPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, isAdmin } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch briefing for selected date
  const { data: briefing, isLoading } = useQuery({
    queryKey: ['briefing', selectedDate],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('briefings')
        .select('*')
        .eq('date', selectedDate)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })

  // Fetch user interactions
  const { data: interactions } = useQuery({
    queryKey: ['briefing-interactions', briefing?.id],
    queryFn: async () => {
      if (!briefing?.id || !user?.id) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('briefing_interactions')
        .select('*')
        .eq('briefing_id', briefing.id)
        .eq('user_id', user.id)

      if (error) throw error
      return data
    },
    enabled: !!briefing?.id && !!user?.id,
  })

  // Interaction mutation
  const interactionMutation = useMutation({
    mutationFn: async ({
      itemIndex,
      action,
    }: {
      itemIndex: number
      action: 'pin' | 'hide' | 'read'
    }) => {
      if (!briefing?.id || !user?.id) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('briefing_interactions').upsert({
        briefing_id: briefing.id,
        item_index: itemIndex,
        user_id: user.id,
        action,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing-interactions'] })
    },
  })

  // Generate briefing mutation (admin only)
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/briefing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate briefing')
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['briefing', selectedDate] })
      toast({ 
        title: 'Briefing generado', 
        description: `Se generaron ${data.briefing?.items_count || 0} items`,
        variant: 'success' 
      })
    },
    onError: (error) => {
      toast({ 
        title: 'Error al generar briefing', 
        description: error.message, 
        variant: 'destructive' 
      })
    },
  })

  const items = (briefing?.items as BriefingItem[]) || []
  const pinnedIndices = new Set(
    (interactions as BriefingInteraction[] | undefined)?.filter((i: BriefingInteraction) => i.action === 'pin').map((i: BriefingInteraction) => i.item_index) || []
  )
  const hiddenIndices = new Set(
    (interactions as BriefingInteraction[] | undefined)?.filter((i: BriefingInteraction) => i.action === 'hide').map((i: BriefingInteraction) => i.item_index) || []
  )

  const visibleItems = items.filter((_, i) => !hiddenIndices.has(i))
  const totalReadingTime = calculateReadingTime(
    visibleItems.map((i) => i.fact + i.why_it_matters).join(' ')
  )

  const handleExport = (format: 'md' | 'pdf') => {
    if (!briefing || visibleItems.length === 0) {
      toast({
        title: 'No briefing to export',
        description: 'Generate or select a briefing first.',
        variant: 'destructive',
      })
      return
    }
    const dateFormatted = formatDate(selectedDate, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const slug = selectedDate.replace(/-/g, '')
    try {
      if (format === 'md') {
        const md = exportBriefingToMarkdown(visibleItems, selectedDate, dateFormatted)
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
        downloadBlob(blob, `inteldesk-briefing-${slug}.md`)
      } else {
        const blob = exportBriefingToPdf(visibleItems, selectedDate, dateFormatted)
        downloadBlob(blob, `inteldesk-briefing-${slug}.pdf`)
      }
      toast({
        title: 'Export complete',
        description: `Briefing exported as ${format.toUpperCase()}`,
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  // Handle export triggered from command palette (Ctrl+K > Export today's briefing)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const format = sessionStorage.getItem('briefing-export') as 'md' | 'pdf' | null
    if (format && (format === 'md' || format === 'pdf') && briefing && visibleItems.length > 0) {
      sessionStorage.removeItem('briefing-export')
      handleExport(format)
    }
  }, [briefing, visibleItems.length, selectedDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Daily briefing
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            {formatDate(selectedDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin() && (
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              {generateMutation.isPending ? 'Generating...' : 'Regenerate'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!briefing || visibleItems.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('md')}>
                <FileText className="mr-2 h-4 w-4" />
                Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date selector and stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-intel-surface border border-intel-border rounded-md px-3 py-2 text-sm text-intel-text"
          />
          {briefing && (
            <div className="flex items-center gap-4 text-sm text-intel-muted">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {visibleItems.length} items
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{totalReadingTime} min read
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Briefing content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : briefing && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item: BriefingItem, index: number) => (
            <BriefingItemCard
              key={index}
              item={item}
              index={index}
              onPin={() => interactionMutation.mutate({ itemIndex: index, action: 'pin' })}
              onHide={() => interactionMutation.mutate({ itemIndex: index, action: 'hide' })}
              isPinned={pinnedIndices.has(index)}
              isHidden={hiddenIndices.has(index)}
            />
          ))}

          {/* Hidden items notice */}
          {hiddenIndices.size > 0 && (
            <Card className="intel-card border-dashed">
              <CardContent className="p-4 text-center text-intel-muted">
                <p className="text-sm">
                  {hiddenIndices.size} item(s) hidden.{' '}
                  <button
                    className="text-intel-accent hover:underline"
                    onClick={() => {
                      // Clear hidden items
                      hiddenIndices.forEach((index) => {
                        interactionMutation.mutate({ itemIndex: index, action: 'read' })
                      })
                    }}
                  >
                    Show all
                  </button>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Newspaper className="h-16 w-16 text-intel-muted mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              No briefing for this date
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md">
              Briefings are generated daily at 06:00 UTC based on the latest intelligence.
              {isAdmin() && ' You can manually generate one using the button above.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Watermark */}
      {briefing && user && (
        <div className="watermark">
          INTEL DESK • {user.email} • {formatDate(new Date())}
        </div>
      )}
    </div>
  )
}

