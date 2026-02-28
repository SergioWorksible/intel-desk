'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Building2,
  TrendingUp,
  User,
  Landmark,
  Target,
  AlertTriangle,
  CheckSquare,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

type ActorType = 'company' | 'investor' | 'individual' | 'government'

interface Option {
  name: string
  description: string
  trade_offs: string
}

interface PlaybookForm {
  title: string
  actor_type: ActorType
  objective: string
  options: Option[]
  triggers: string[]
  type_i_cost: string
  type_ii_cost: string
  checklist: string[]
  response_72h: string
}

const actorIcons: Record<ActorType, typeof Building2> = {
  company: Building2,
  investor: TrendingUp,
  individual: User,
  government: Landmark,
}

export default function NewPlaybookPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [form, setForm] = useState<PlaybookForm>({
    title: '',
    actor_type: 'company',
    objective: '',
    options: [{ name: '', description: '', trade_offs: '' }],
    triggers: [''],
    type_i_cost: '',
    type_ii_cost: '',
    checklist: [''],
    response_72h: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PlaybookForm) => {
      const { data: { user } } = await supabase.auth.getUser()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: playbook, error } = await (supabase as any)
        .from('playbooks')
        .insert({
          title: data.title,
          actor_type: data.actor_type,
          objective: data.objective,
          options: data.options.filter((o: any) => o.name),
          triggers: data.triggers.filter((t: any) => t),
          type_i_cost: data.type_i_cost || null,
          type_ii_cost: data.type_ii_cost || null,
          checklist: data.checklist.filter((c: any) => c),
          response_72h: data.response_72h,
          user_id: user?.id,
        })
        .select()
        .single()

      if (error) throw error
      return playbook
    },
    onSuccess: (playbook) => {
      toast({
        title: 'Playbook created',
        description: 'Your action plan has been saved.',
      })
      router.push(`/playbooks/${playbook.id}`)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleAddOption = () => {
    setForm({
      ...form,
      options: [...form.options, { name: '', description: '', trade_offs: '' }],
    })
  }

  const handleRemoveOption = (index: number) => {
    setForm({
      ...form,
      options: form.options.filter((_, i) => i !== index),
    })
  }

  const handleOptionChange = (index: number, field: keyof Option, value: string) => {
    const newOptions = [...form.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setForm({ ...form, options: newOptions })
  }

  const handleAddTrigger = () => {
    setForm({ ...form, triggers: [...form.triggers, ''] })
  }

  const handleRemoveTrigger = (index: number) => {
    setForm({
      ...form,
      triggers: form.triggers.filter((_, i) => i !== index),
    })
  }

  const handleTriggerChange = (index: number, value: string) => {
    const newTriggers = [...form.triggers]
    newTriggers[index] = value
    setForm({ ...form, triggers: newTriggers })
  }

  const handleAddChecklistItem = () => {
    setForm({ ...form, checklist: [...form.checklist, ''] })
  }

  const handleRemoveChecklistItem = (index: number) => {
    setForm({
      ...form,
      checklist: form.checklist.filter((_, i) => i !== index),
    })
  }

  const handleChecklistChange = (index: number, value: string) => {
    const newChecklist = [...form.checklist]
    newChecklist[index] = value
    setForm({ ...form, checklist: newChecklist })
  }

  // Generate with AI
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!form.objective || !form.actor_type) {
        throw new Error('Objective and actor type are required')
      }

      const response = await fetch('/api/playbooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorType: form.actor_type,
          objective: form.objective,
          language: language,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate playbook')
      return response.json()
    },
    onSuccess: (data) => {
      const playbook = data.playbook
      setForm({
        title: playbook.title || '',
        actor_type: form.actor_type,
        objective: playbook.objective || '',
        options: playbook.options || [],
        triggers: playbook.triggers || [],
        type_i_cost: playbook.type_i_cost || '',
        type_ii_cost: playbook.type_ii_cost || '',
        checklist: playbook.checklist || [],
        response_72h: playbook.response_72h || '',
      })
      toast({
        title: 'Playbook generado',
        description: 'El playbook ha sido generado con IA. Revisa y ajusta según sea necesario.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleGenerate = () => {
    if (!form.objective || !form.objective.trim()) {
      toast({
        title: 'Objetivo requerido',
        description: 'Por favor ingresa un objetivo antes de generar.',
        variant: 'destructive',
      })
      return
    }
    generateMutation.mutate()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const isValid = form.title && form.objective && form.options.some((o: any) => o && o.name)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/playbooks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            New playbook
          </h1>
          <p className="text-sm text-intel-muted">
            Create an action plan for a specific scenario
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-intel-accent" />
              Basic information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="title">Playbook title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., China-Taiwan escalation response"
                />
              </div>
              <div className="space-y-2">
                <Label>Actor type</Label>
                <Select
                  value={form.actor_type}
                  onValueChange={(value) =>
                    setForm({ ...form, actor_type: value as ActorType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(actorIcons).map(([type, Icon]) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2 capitalize">
                          <Icon className="h-4 w-4" />
                          {type}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="objective">Objective</Label>
                <div className="flex items-center gap-2">
                  <Select value={language} onValueChange={(value) => setLanguage(value as 'es' | 'en')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={!form.objective || !form.objective.trim() || generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar con IA
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Textarea
                id="objective"
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                placeholder="¿Qué objetivo busca lograr este playbook? (ej: Responder a escalada militar en Taiwán)"
                rows={3}
              />
              <p className="text-xs text-intel-muted">
                Ingresa el objetivo y haz clic en "Generar con IA" para crear un playbook completo automáticamente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card className="intel-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Strategic options</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                <Plus className="h-4 w-4 mr-1" />
                Add option
              </Button>
            </div>
            <CardDescription>
              Define the available courses of action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.options.map((option: any, index: number) => (
              <div key={index} className="p-4 rounded-lg bg-intel-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Option {String.fromCharCode(65 + index)}</Badge>
                  {form.options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  value={option.name}
                  onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                  placeholder="Option name"
                />
                <Textarea
                  value={option.description}
                  onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                  placeholder="Description of this option..."
                  rows={2}
                />
                <Textarea
                  value={option.trade_offs}
                  onChange={(e) => handleOptionChange(index, 'trade_offs', e.target.value)}
                  placeholder="Trade-offs and considerations..."
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Triggers */}
        <Card className="intel-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Activation triggers
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTrigger}>
                <Plus className="h-4 w-4 mr-1" />
                Add trigger
              </Button>
            </div>
            <CardDescription>
              Signals that indicate this playbook should be activated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {form.triggers.map((trigger, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={trigger}
                  onChange={(e) => handleTriggerChange(index, e.target.value)}
                  placeholder="e.g., Military exercises announced..."
                />
                {form.triggers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTrigger(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cost of being wrong */}
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Costos de error
            </CardTitle>
            <CardDescription>
              ¿Qué sucede si este plan se ejecuta incorrectamente o en el momento equivocado?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type_i_cost">Costo de error tipo I (actuar cuando no se debería)</Label>
              <Textarea
                id="type_i_cost"
                value={form.type_i_cost}
                onChange={(e) => setForm({ ...form, type_i_cost: e.target.value })}
                placeholder="Describe las consecuencias de actuar cuando no se debería..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_ii_cost">Costo de error tipo II (no actuar cuando se debería)</Label>
              <Textarea
                id="type_ii_cost"
                value={form.type_ii_cost}
                onChange={(e) => setForm({ ...form, type_ii_cost: e.target.value })}
                placeholder="Describe las consecuencias de no actuar cuando se debería..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card className="intel-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-400" />
                Action checklist
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddChecklistItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add item
              </Button>
            </div>
            <CardDescription>
              Step-by-step actions to execute when activated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {form.checklist.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm font-mono text-intel-muted w-6">{index + 1}.</span>
                <Input
                  value={item}
                  onChange={(e) => handleChecklistChange(index, e.target.value)}
                  placeholder="Action item..."
                />
                {form.checklist.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChecklistItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 72h Response */}
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
            <Textarea
              value={form.response_72h}
              onChange={(e) => setForm({ ...form, response_72h: e.target.value })}
              placeholder="Detail the immediate response protocol..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/playbooks">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={!isValid || createMutation.isPending}
            className="bg-intel-accent hover:bg-intel-accent/80"
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create playbook'}
          </Button>
        </div>
      </form>
    </div>
  )
}

