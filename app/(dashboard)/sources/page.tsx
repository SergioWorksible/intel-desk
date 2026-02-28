'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import {
  Database,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Rss,
  Globe,
  Building,
  Radio,
  FileText,
  Activity,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Database as DB } from '@/types/database'

type Source = DB['public']['Tables']['sources']['Row']
type SourceType = DB['public']['Tables']['sources']['Row']['type']

const sourceTypeIcons: Record<SourceType, typeof Rss> = {
  media: Radio,
  official: Building,
  wire: Rss,
  'think-tank': FileText,
  sensor: Activity,
}

const sourceTypeLabels: Record<SourceType, string> = {
  media: 'Media',
  official: 'Official',
  wire: 'Wire Service',
  'think-tank': 'Think Tank',
  sensor: 'Sensor',
}

function SourceForm({
  source,
  onSubmit,
  onCancel,
}: {
  source?: Source
  onSubmit: (data: Partial<Source>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: source?.name || '',
    type: source?.type || 'media',
    rss_url: source?.rss_url || '',
    website_url: source?.website_url || '',
    country: source?.country || '',
    language: source?.language || 'en',
    reputation_base: source?.reputation_base || 50,
    enabled: source?.enabled ?? true,
    tags: source?.tags?.join(', ') || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as SourceType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sourceTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rss_url">RSS URL</Label>
        <Input
          id="rss_url"
          type="url"
          value={formData.rss_url}
          onChange={(e) => setFormData({ ...formData, rss_url: e.target.value })}
          placeholder="https://example.com/feed.xml"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website_url">Website URL</Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
          placeholder="https://example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="US"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            placeholder="en"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reputation base: {formData.reputation_base}</Label>
        <Slider
          value={[formData.reputation_base]}
          onValueChange={([value]) => setFormData({ ...formData, reputation_base: value })}
          max={100}
          step={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="news, international, finance"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
        <Label htmlFor="enabled">Enabled</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{source ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  )
}

export default function SourcesPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { isAdmin } = useAuthStore()
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filter, setFilter] = useState<SourceType | 'all'>('all')

  // Fetch sources
  const { data: sources, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sources')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Source[]
    },
  })

  // Create source mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Source>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('sources').insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      setIsCreateDialogOpen(false)
      toast({ title: 'Source created', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create source', description: error.message, variant: 'destructive' })
    },
  })

  // Update source mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Source> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('sources').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      setEditingSource(null)
      toast({ title: 'Source updated', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Failed to update source', description: error.message, variant: 'destructive' })
    },
  })

  // Delete source mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('sources').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast({ title: 'Source deleted', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Failed to delete source', description: error.message, variant: 'destructive' })
    },
  })

  // Toggle source enabled
  const toggleEnabled = async (source: Source) => {
    await updateMutation.mutateAsync({
      id: source.id,
      data: { enabled: !source.enabled },
    })
  }

  const filteredSources = sources?.filter(
    (s) => filter === 'all' || s.type === filter
  )

  const stats = sources
    ? {
        total: sources.length,
        enabled: sources.filter((s) => s.enabled).length,
        byType: Object.entries(
          sources.reduce((acc, s) => {
            acc[s.type] = (acc[s.type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        ),
      }
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Source management
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Configure and manage intelligence sources
          </p>
        </div>
        {isAdmin() && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add source
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add new source</DialogTitle>
                <DialogDescription>
                  Configure a new intelligence source for ingestion
                </DialogDescription>
              </DialogHeader>
              <SourceForm
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-intel-accent" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.total}
                  </p>
                  <p className="text-xs text-intel-muted">Total sources</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="intel-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-mono font-bold text-intel-text">
                    {stats.enabled}
                  </p>
                  <p className="text-xs text-intel-muted">Active sources</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {stats.byType.slice(0, 2).map(([type, count]) => {
            const Icon = sourceTypeIcons[type as SourceType]
            return (
              <Card key={type} className="intel-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-intel-muted" />
                    <div>
                      <p className="text-2xl font-mono font-bold text-intel-text">
                        {count}
                      </p>
                      <p className="text-xs text-intel-muted capitalize">{type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as SourceType | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(sourceTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sources list */}
      <Card className="intel-card">
        <CardHeader>
          <CardTitle className="text-base font-mono">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={10} cols={5} />
          ) : filteredSources && filteredSources.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredSources.map((source: any) => {
                  const Icon = sourceTypeIcons[source.type as SourceType]
                  return (
                    <div
                      key={source.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intel-border">
                        <Icon className="h-5 w-5 text-intel-text" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-intel-text truncate">
                            {source.name}
                          </h3>
                          {!source.enabled && (
                            <Badge variant="outline" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-intel-muted">
                          <span>{sourceTypeLabels[source.type as SourceType]}</span>
                          {source.country && (
                            <>
                              <span>•</span>
                              <span>{source.country}</span>
                            </>
                          )}
                          {source.last_fetched_at && (
                            <>
                              <span>•</span>
                              <span>Last fetch: {formatRelativeTime(source.last_fetched_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={source.reputation_base >= 70 ? 'success' : source.reputation_base >= 40 ? 'warning' : 'error'}
                          className="font-mono"
                        >
                          {source.reputation_base}
                        </Badge>
                        {source.rss_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={source.rss_url} target="_blank" rel="noopener noreferrer">
                              <Rss className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {source.website_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={source.website_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {isAdmin() && (
                          <>
                            <Switch
                              checked={source.enabled}
                              onCheckedChange={() => toggleEnabled(source)}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingSource(source)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteMutation.mutate(source.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-intel-muted">
              <Database className="h-12 w-12 mb-4 opacity-50" />
              <p>No sources found</p>
              <p className="text-xs">Add sources to start ingesting intelligence</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingSource} onOpenChange={() => setEditingSource(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit source</DialogTitle>
            <DialogDescription>
              Update source configuration
            </DialogDescription>
          </DialogHeader>
          {editingSource && (
            <SourceForm
              source={editingSource}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingSource.id, data })
              }
              onCancel={() => setEditingSource(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

