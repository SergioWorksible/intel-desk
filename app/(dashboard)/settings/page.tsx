'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Settings,
  Shield,
  Database,
  Cpu,
  Clock,
  RefreshCw,
  Save,
  AlertTriangle,
  Trash2,
  FileText,
  Zap,
  Scale,
  Lock,
  Eye,
} from 'lucide-react'

interface GlobalSettings {
  allowlist_mode: boolean
  ingest_interval_minutes: number
  scoring_weights: {
    reputation_base: number
    independence: number
    recency: number
    consistency: number
    proximity_to_primary: number
  }
  data_retention_days: number
  full_text_fetching: boolean
  max_articles_per_source: number
  clustering_threshold: number
  ai_temperature: number
}

const defaultSettings: GlobalSettings = {
  allowlist_mode: false,
  ingest_interval_minutes: 60,
  scoring_weights: {
    reputation_base: 0.25,
    independence: 0.20,
    recency: 0.20,
    consistency: 0.20,
    proximity_to_primary: 0.15,
  },
  data_retention_days: 90,
  full_text_fetching: false,
  max_articles_per_source: 100,
  clustering_threshold: 0.7,
  ai_temperature: 0.2,
}

export default function SettingsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('settings')
        .select('*')
        .eq('key', 'global')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data?.value as GlobalSettings | null
    },
  })

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
  })

  // Fetch prompts
  const { data: prompts } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('settings')
        .select('*')
        .eq('key', 'prompts')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data?.value as Record<string, string> | null
    },
  })

  // Initialize settings
  useEffect(() => {
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...savedSettings })
    }
  }, [savedSettings])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: GlobalSettings) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('settings')
        .upsert({
          key: 'global',
          value: newSettings,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-settings'] })
      setHasChanges(false)
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se aplicarán en el próximo ciclo de ingesta.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleChange = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleWeightChange = (key: keyof GlobalSettings['scoring_weights'], value: number) => {
    setSettings((prev) => ({
      ...prev,
      scoring_weights: { ...prev.scoring_weights, [key]: value },
    }))
    setHasChanges(true)
  }

  const normalizeWeights = () => {
    const weights = settings.scoring_weights
    const total = Object.values(weights).reduce((a: number, b: number) => a + b, 0)
    if (total === 0) return

    const normalized = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, v / total])
    ) as GlobalSettings['scoring_weights']

    setSettings((prev) => ({ ...prev, scoring_weights: normalized }))
    setHasChanges(true)
  }

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-intel-accent" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-intel-accent/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-intel-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-mono font-bold text-intel-text">
              Configuración del sistema
            </h1>
            <p className="text-sm text-intel-muted">
              Ajustes de ingesta, puntuación y comportamiento del sistema
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className="bg-intel-accent hover:bg-intel-accent/80"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <p className="text-sm text-amber-400">Hay cambios sin guardar</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="scoring">Puntuación</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        {/* General settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-intel-accent" />
                Ingesta de datos
              </CardTitle>
              <CardDescription>
                Configuración del pipeline de recolección de fuentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo allowlist</Label>
                  <p className="text-xs text-intel-muted">
                    Solo procesar fuentes aprobadas explícitamente
                  </p>
                </div>
                <Switch
                  checked={settings.allowlist_mode}
                  onCheckedChange={(checked) => handleChange('allowlist_mode', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Intervalo de ingesta</Label>
                  <span className="text-sm font-mono text-intel-accent">
                    {settings.ingest_interval_minutes} min
                  </span>
                </div>
                <Slider
                  value={[settings.ingest_interval_minutes]}
                  onValueChange={([value]) => handleChange('ingest_interval_minutes', value)}
                  min={15}
                  max={240}
                  step={15}
                />
                <p className="text-xs text-intel-muted">
                  Frecuencia con la que se revisan las fuentes RSS
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Full-text fetching</Label>
                  <p className="text-xs text-intel-muted">
                    Descargar contenido completo de artículos (mayor precisión, más lento)
                  </p>
                </div>
                <Switch
                  checked={settings.full_text_fetching}
                  onCheckedChange={(checked) => handleChange('full_text_fetching', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Artículos máximos por fuente</Label>
                  <Input
                    type="number"
                    value={settings.max_articles_per_source}
                    onChange={(e) =>
                      handleChange('max_articles_per_source', parseInt(e.target.value) || 100)
                    }
                    className="w-24 text-right"
                    min={10}
                    max={500}
                  />
                </div>
                <p className="text-xs text-intel-muted">
                  Límite de artículos a procesar por fuente en cada ciclo
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-intel-accent" />
                Retención de datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Días de retención</Label>
                <Input
                  type="number"
                  value={settings.data_retention_days}
                  onChange={(e) =>
                    handleChange('data_retention_days', parseInt(e.target.value) || 90)
                  }
                  className="w-24 text-right"
                  min={30}
                  max={365}
                />
              </div>
              <p className="text-xs text-intel-muted">
                Artículos más antiguos serán archivados automáticamente
              </p>
            </CardContent>
          </Card>

          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-intel-accent" />
                Clustering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Umbral de similitud</Label>
                <span className="text-sm font-mono text-intel-accent">
                  {(settings.clustering_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[settings.clustering_threshold * 100]}
                onValueChange={([value]) => handleChange('clustering_threshold', value / 100)}
                min={50}
                max={95}
                step={5}
              />
              <p className="text-xs text-intel-muted">
                Porcentaje mínimo de similitud para agrupar artículos en clusters
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring settings */}
        <TabsContent value="scoring" className="space-y-4">
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-intel-accent" />
                Pesos de puntuación de fuentes
              </CardTitle>
              <CardDescription>
                Define la importancia relativa de cada factor en el cálculo de credibilidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings.scoring_weights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">
                      {key.replace(/_/g, ' ')}
                    </Label>
                    <span className="text-sm font-mono text-intel-accent">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[value * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange(
                        key as keyof GlobalSettings['scoring_weights'],
                        v / 100
                      )
                    }
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-intel-text">Total actual</p>
                  <p className="text-xs text-intel-muted">Los pesos deben sumar 100%</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-lg font-mono ${
                      Math.abs(
                        Object.values(settings.scoring_weights).reduce((a, b) => a + b, 0) - 1
                      ) < 0.01
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {(
                      Object.values(settings.scoring_weights).reduce((a: number, b: number) => a + b, 0) * 100
                    ).toFixed(0)}
                    %
                  </span>
                  <Button variant="outline" size="sm" onClick={normalizeWeights}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Normalizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="intel-card border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-intel-accent shrink-0" />
                <div className="text-sm text-intel-muted">
                  <p className="font-medium text-intel-text mb-1">Descripción de factores</p>
                  <ul className="space-y-1 text-xs">
                    <li>
                      <strong>Reputation base:</strong> Historial y reconocimiento de la fuente
                    </li>
                    <li>
                      <strong>Independence:</strong> Autonomía editorial (sin influencia estatal/corporativa)
                    </li>
                    <li>
                      <strong>Recency:</strong> Actualidad de la información
                    </li>
                    <li>
                      <strong>Consistency:</strong> Coherencia con otras fuentes verificadas
                    </li>
                    <li>
                      <strong>Proximity to primary:</strong> Cercanía a fuentes primarias (testigos, documentos)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI settings */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-intel-accent" />
                Parámetros de IA
              </CardTitle>
              <CardDescription>
                Configuración del comportamiento del modelo de lenguaje
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Temperatura</Label>
                  <span className="text-sm font-mono text-intel-accent">
                    {settings.ai_temperature.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[settings.ai_temperature * 100]}
                  onValueChange={([value]) => handleChange('ai_temperature', value / 100)}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-intel-muted">
                  Valores más bajos = respuestas más deterministas. Recomendado: 0.1-0.3 para análisis riguroso.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="intel-card border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Shield className="h-5 w-5" />
                Principios de IA no negociables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-intel-muted shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-intel-text">Grounded AI only</p>
                  <p className="text-intel-muted">
                    La IA SOLO usa evidencia de la base de datos. Está prohibido generar hechos o citas inventadas.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="h-4 w-4 text-intel-muted shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-intel-text">Separación estricta</p>
                  <p className="text-intel-muted">
                    HECHOS (citados), INFERENCIAS (etiquetadas), HIPÓTESIS (probabilísticas, falsificables).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-intel-muted shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-intel-text">Disciplina sobre certeza</p>
                  <p className="text-intel-muted">
                    Las hipótesis requieren señales de falsificación. Si la evidencia es insuficiente, debe declararlo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts */}
        <TabsContent value="prompts" className="space-y-4">
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-intel-accent" />
                Plantillas de prompts
              </CardTitle>
              <CardDescription>
                Personaliza los prompts del sistema para los diferentes módulos de IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Prompt de briefing diario</Label>
                <Textarea
                  className="font-mono text-xs h-32"
                  placeholder="System prompt para generar el briefing diario..."
                  defaultValue={prompts?.briefing || ''}
                />
              </div>

              <div className="space-y-3">
                <Label>Prompt de research</Label>
                <Textarea
                  className="font-mono text-xs h-32"
                  placeholder="System prompt para el modo research..."
                  defaultValue={prompts?.research || ''}
                />
              </div>

              <div className="space-y-3">
                <Label>Prompt de red team</Label>
                <Textarea
                  className="font-mono text-xs h-32"
                  placeholder="System prompt para análisis red team..."
                  defaultValue={prompts?.red_team || ''}
                />
              </div>

              <Button variant="outline" className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar prompts
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit log */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="intel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-intel-accent" />
                Registro de auditoría
              </CardTitle>
              <CardDescription>
                Últimas 50 acciones registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {auditLog && auditLog.length > 0 ? (
                  <div className="space-y-2 pr-4">
                    {auditLog.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 p-2 rounded bg-intel-border/30 text-sm"
                      >
                        <Badge
                          variant="outline"
                          className={
                            entry.action === 'create'
                              ? 'border-emerald-500/50 text-emerald-400'
                              : entry.action === 'delete'
                              ? 'border-red-500/50 text-red-400'
                              : 'border-amber-500/50 text-amber-400'
                          }
                        >
                          {entry.action}
                        </Badge>
                        <span className="text-intel-text font-medium">{entry.entity_type}</span>
                        <span className="text-intel-muted text-xs truncate flex-1">
                          {entry.entity_id}
                        </span>
                        <span className="text-intel-muted text-xs">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-intel-muted">
                    <Shield className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No hay registros de auditoría</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="intel-card border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <Trash2 className="h-5 w-5" />
                Zona de peligro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-intel-text">Limpiar datos antiguos</p>
                  <p className="text-xs text-intel-muted">
                    Eliminar artículos y clusters más antiguos que el período de retención
                  </p>
                </div>
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ejecutar
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-intel-text">Reiniciar configuración</p>
                  <p className="text-xs text-intel-muted">
                    Restaurar todos los ajustes a sus valores por defecto
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    setSettings(defaultSettings)
                    setHasChanges(true)
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reiniciar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
