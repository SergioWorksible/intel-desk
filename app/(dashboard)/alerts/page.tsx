'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Bell,
  Plus,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Globe,
  Tag,
  Building2,
  Check,
  X,
  Clock,
  Filter,
  Mail,
  Zap,
} from 'lucide-react'
import { formatRelativeTime, getSeverityColor } from '@/lib/utils'

type AlertInsert = Database['public']['Tables']['alerts']['Insert']

interface AlertRule {
  id: string
  user_id: string
  name: string
  type: 'threshold' | 'volume' | 'correlation' | 'event'
  config: Record<string, any>
  enabled: boolean
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

interface AlertEvent {
  id: string
  alert_id: string
  user_id: string
  message: string
  data: Record<string, any>
  read: boolean
  created_at: string
  alerts?: AlertRule
}

export default function AlertsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showNewRule, setShowNewRule] = useState(false)
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    type: 'threshold',
    config: {
      value: '',
      notify_realtime: true,
      notify_digest: true,
    },
    enabled: true,
  })

  // Fetch alert rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return []
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as AlertRule[]
    },
  })

  // Fetch alert events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['alert-events'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return []
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('alert_events')
        .select('*, alerts!alert_id(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data as AlertEvent[]
    },
  })

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (rule: Partial<AlertRule>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('User not authenticated')
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('alerts')
        .insert({
          user_id: user.id,
          name: rule.name || 'Untitled Alert',
          type: rule.type || 'threshold',
          config: rule.config || { value: '', notify_realtime: true, notify_digest: true },
          enabled: rule.enabled ?? true,
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      setShowNewRule(false)
      setNewRule({
        name: '',
        type: 'threshold',
        config: {
          value: '',
          notify_realtime: true,
          notify_digest: true,
        },
        enabled: true,
      })
      toast({
        title: 'Regla creada',
        description: 'Recibirás alertas cuando se cumplan las condiciones.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error al crear regla',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('alerts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast({
        title: 'Regla eliminada',
      })
    },
  })

  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('alerts')
        .update({ enabled })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
  })

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('alert_events')
        .update({ read: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-events'] })
    },
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('alert_events')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-events'] })
      toast({ title: 'Todas las alertas marcadas como leídas' })
    },
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threshold':
        return <AlertTriangle className="h-4 w-4" />
      case 'volume':
        return <TrendingUp className="h-4 w-4" />
      case 'correlation':
        return <Tag className="h-4 w-4" />
      case 'event':
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const unreadCount = events?.filter((e) => !e.read).length || 0

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-mono font-bold text-intel-text">
              Alertas y watchlists
            </h1>
            <p className="text-xs sm:text-sm text-intel-muted">
              Configura qué eventos deseas monitorear
            </p>
          </div>
        </div>
        <Dialog open={showNewRule} onOpenChange={setShowNewRule}>
          <DialogTrigger asChild>
            <Button className="bg-intel-accent hover:bg-intel-accent/80 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nueva regla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear regla de alerta</DialogTitle>
              <DialogDescription>
                Define las condiciones para recibir notificaciones
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de alerta</Label>
                <div className="space-y-2">
                  <Label>Nombre de la alerta</Label>
                  <Input
                    value={newRule.name || ''}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="Ej: Alertas sobre China"
                  />
                </div>
                <Select
                  value={newRule.type}
                  onValueChange={(value: string) =>
                    setNewRule({ ...newRule, type: value as AlertRule['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threshold">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Umbral
                      </span>
                    </SelectItem>
                    <SelectItem value="volume">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Volumen
                      </span>
                    </SelectItem>
                    <SelectItem value="correlation">
                      <span className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Correlación
                      </span>
                    </SelectItem>
                    <SelectItem value="event">
                      <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Evento
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Configuración (JSON)</Label>
                <Input
                  value={newRule.config?.value || ''}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      config: { ...newRule.config, value: e.target.value },
                    })
                  }
                  placeholder="Valor de la alerta..."
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-intel-muted" />
                    <Label>Notificación en tiempo real</Label>
                  </div>
                  <Switch
                    checked={newRule.config?.notify_realtime ?? true}
                    onCheckedChange={(checked: boolean) =>
                      setNewRule({
                        ...newRule,
                        config: { ...newRule.config, notify_realtime: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-intel-muted" />
                    <Label>Incluir en digest diario</Label>
                  </div>
                  <Switch
                    checked={newRule.config?.notify_digest ?? true}
                    onCheckedChange={(checked: boolean) =>
                      setNewRule({
                        ...newRule,
                        config: { ...newRule.config, notify_digest: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewRule(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createRuleMutation.mutate(newRule)}
                disabled={!newRule.name || !newRule.config?.value || createRuleMutation.isPending}
                className="bg-intel-accent hover:bg-intel-accent/80"
              >
                {createRuleMutation.isPending ? 'Creando...' : 'Crear regla'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="events" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Eventos</span>
            <span className="sm:hidden">Eventos</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white ml-1 text-[10px] sm:text-xs">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
            Reglas
          </TabsTrigger>
        </TabsList>

        {/* Events tab */}
        <TabsContent value="events" className="space-y-4">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar todas como leídas
              </Button>
            </div>
          )}

          <Card className="intel-card">
            <CardContent className="p-0">
              {eventsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : events && events.length > 0 ? (
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="divide-y divide-intel-border">
                    {events.map((event: any) => (
                      <div
                        key={event.id}
                        className={`p-3 sm:p-4 flex items-start gap-2 sm:gap-4 transition-colors ${
                          event.read ? 'opacity-60' : 'bg-intel-accent/5'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            event.read
                              ? 'bg-intel-border/50'
                              : 'bg-amber-500/10'
                          }`}
                        >
                          {event.alerts && getTypeIcon(event.alerts.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-intel-text">{event.message}</p>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            {event.alerts && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                {event.alerts.type}: {event.alerts.config?.value || 'N/A'}
                              </Badge>
                            )}
                            {event.data?.severity && (
                              <Badge className={`text-[10px] sm:text-xs ${getSeverityColor(event.data.severity)}`}>
                                Severidad: {event.data.severity}
                              </Badge>
                            )}
                            <span className="text-[10px] sm:text-xs text-intel-muted flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(event.created_at)}
                            </span>
                          </div>
                        </div>
                        {!event.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => markReadMutation.mutate(event.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-intel-muted">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-intel-text mb-1">
                    Sin alertas
                  </p>
                  <p className="text-sm">
                    Las notificaciones aparecerán aquí cuando se activen tus reglas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules tab */}
        <TabsContent value="rules" className="space-y-4">
          {rulesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : rules && rules.length > 0 ? (
            <div className="grid gap-4">
              {rules.map((rule: any) => (
                <Card
                  key={rule.id}
                  className={`intel-card ${!rule.enabled ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          rule.enabled ? 'bg-intel-accent/10' : 'bg-intel-border/50'
                        }`}
                      >
                        {getTypeIcon(rule.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-intel-text capitalize">
                            {rule.type}
                          </span>
                          <Badge variant="outline">{rule.config?.value || 'N/A'}</Badge>
                          {rule.config?.threshold && (
                            <Badge variant="outline" className="text-amber-400">
                              ≥ {rule.config.threshold}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-intel-muted">
                          {rule.config?.notify_realtime && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Tiempo real
                            </span>
                          )}
                          {rule.config?.notify_digest && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Digest
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(rule.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked: boolean) =>
                            toggleRuleMutation.mutate({ id: rule.id, enabled: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="intel-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-intel-muted">
                <Filter className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium text-intel-text mb-1">
                  Sin reglas configuradas
                </p>
                <p className="text-sm mb-4">
                  Crea reglas para monitorear países, temas, entidades o mercados
                </p>
                <Button onClick={() => setShowNewRule(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera regla
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick add presets */}
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="text-base">Presets recomendados</CardTitle>
              <CardDescription>
                Reglas comunes para monitoreo geopolítico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Alertas sobre US', type: 'threshold' as const, config: { value: 'US', notify_realtime: true, notify_digest: true } },
                  { name: 'Alertas sobre China', type: 'threshold' as const, config: { value: 'CN', notify_realtime: true, notify_digest: true } },
                  { name: 'Alertas sobre Rusia', type: 'threshold' as const, config: { value: 'RU', notify_realtime: true, notify_digest: true } },
                  { name: 'Alta severidad', type: 'threshold' as const, config: { value: '8', notify_realtime: true, notify_digest: true } },
                ].map((preset: any) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewRule({
                        name: preset.name,
                        type: preset.type,
                        config: preset.config,
                        enabled: true,
                      })
                      setShowNewRule(true)
                    }}
                  >
                    {getTypeIcon(preset.type)}
                    <span className="ml-1">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
