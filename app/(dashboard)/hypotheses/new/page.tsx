'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
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
  Lightbulb,
  ArrowLeft,
  Plus,
  X,
  Loader2,
  Save,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

export default function NewHypothesisPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [statement, setStatement] = useState('')
  const [probInitial, setProbInitial] = useState(50)
  const [probCalculatedByAI, setProbCalculatedByAI] = useState(false)
  const [assumptions, setAssumptions] = useState<string[]>([''])
  const [confirmSignals, setConfirmSignals] = useState<string[]>([''])
  const [falsifySignals, setFalsifySignals] = useState<string[]>([''])
  const [nextReviewDays, setNextReviewDays] = useState(30)
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  // Generate analysis with AI
  const generateAnalysisMutation = useMutation({
    mutationFn: async () => {
      if (!title || !statement) {
        throw new Error('Title and statement are required')
      }

      const response = await fetch('/api/hypothesis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: null, // New hypothesis
          title,
          statement,
          assumptions: assumptions.filter(Boolean),
          language: language,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate analysis')
      return response.json()
    },
    onSuccess: (data) => {
      const analysis = data.analysis
      console.log('Hypothesis analysis response:', analysis)
      
      // Normalize confirm signals - handle both camelCase and snake_case, and object arrays
      const confirmSignalsRaw = 
        analysis.confirmSignals || 
        analysis.confirmation_signals || 
        analysis.confirm_signals || 
        []
      
      const extractSignals = (signals: any[]): string[] => {
        if (!Array.isArray(signals)) return []
        return signals
          .map((s) => {
            if (typeof s === 'string') return s.trim()
            if (s && typeof s === 'object' && s.signal) return String(s.signal).trim()
            if (s && typeof s === 'object' && s.text) return String(s.text).trim()
            return null
          })
          .filter((s): s is string => s !== null && s !== '')
      }
      
      const confirmSignals = extractSignals(confirmSignalsRaw)
      if (confirmSignals.length > 0) {
        setConfirmSignals(confirmSignals)
      }
      
      // Normalize falsify signals
      const falsifySignalsRaw = 
        analysis.falsifySignals || 
        analysis.falsification_signals || 
        analysis.falsify_signals || 
        []
      
      const falsifySignals = extractSignals(falsifySignalsRaw)
      if (falsifySignals.length > 0) {
        setFalsifySignals(falsifySignals)
      }
      
      // Normalize probability estimate
      const probabilityEstimate = 
        analysis.probabilityEstimate !== undefined ? analysis.probabilityEstimate :
        analysis.initial_probability_estimate !== undefined ? analysis.initial_probability_estimate :
        analysis.prob_initial !== undefined ? analysis.prob_initial :
        undefined
      
      if (probabilityEstimate !== undefined) {
        const probValue = Math.max(0, Math.min(100, Number(probabilityEstimate)))
        setProbInitial(probValue)
        setProbCalculatedByAI(true)
      }
      
      toast({
        title: 'Análisis generado',
        description: `Se generaron ${confirmSignals.length} señales de confirmación, ${falsifySignals.length} señales de falsificación${probabilityEstimate !== undefined ? ` y se calculó una probabilidad inicial de ${Math.max(0, Math.min(100, Number(probabilityEstimate)))}%` : ''}.`,
        variant: 'success',
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + nextReviewDays)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('hypotheses')
        .insert({
          user_id: user.id,
          title,
          statement,
          prob_initial: probInitial,
          prob_current: probInitial,
          assumptions: assumptions.filter(Boolean),
          confirm_signals: confirmSignals.filter(Boolean),
          falsify_signals: falsifySignals.filter(Boolean),
          next_review_at: nextReviewAt.toISOString(),
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast({ title: 'Hypothesis created', variant: 'success' })
      router.push(`/hypotheses/${data.id}`)
    },
    onError: (error) => {
      toast({
        title: 'Failed to create hypothesis',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !statement) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the title and statement',
        variant: 'destructive',
      })
      return
    }
    createMutation.mutate()
  }

  const addItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList([...list, ''])
  }

  const updateItem = (
    index: number,
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const newList = [...list]
    newList[index] = value
    setList(newList)
  }

  const removeItem = (
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.length === 1) return
    const newList = list.filter((_, i) => i !== index)
    setList(newList)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hypotheses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            New hypothesis
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Create a falsifiable prediction with discipline
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <Card className="intel-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-intel-accent" />
              Hypothesis
            </CardTitle>
            <CardDescription>
              Define your prediction clearly and specifically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., China will annex Taiwan by 2027"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="statement">Statement</Label>
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
                    onClick={() => generateAnalysisMutation.mutate()}
                    disabled={!title.trim() || !statement.trim() || generateAnalysisMutation.isPending}
                  >
                    {generateAnalysisMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar señales con IA
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Textarea
                id="statement"
                placeholder="State the hypothesis precisely. What exactly are you predicting? What would constitute confirmation or falsification?"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-intel-muted">
                Ingresa título y statement, luego haz clic en "Generar señales con IA" para generar señales de confirmación/falsificación automáticamente
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Probabilidad inicial: {probInitial}%</Label>
                  {probCalculatedByAI && (
                    <Badge variant="info" className="text-xs">
                      Calculada por IA
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="font-mono">
                  {probInitial < 33 ? 'Baja' : probInitial < 67 ? 'Media' : 'Alta'}
                </Badge>
              </div>
              <Slider
                value={[probInitial]}
                onValueChange={([value]: number[]) => {
                  setProbInitial(value)
                  setProbCalculatedByAI(false) // Si el usuario la cambia manualmente, ya no es calculada por IA
                }}
                min={1}
                max={99}
                step={1}
              />
              <p className="text-xs text-intel-muted">
                {probCalculatedByAI 
                  ? 'La probabilidad fue calculada automáticamente por la IA basándose en el análisis. Puedes ajustarla manualmente si lo deseas.'
                  : 'Tu confianza inicial en esta hipótesis (1-99%). Haz clic en "Generar señales con IA" para que la IA calcule la probabilidad automáticamente.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Assumptions */}
        <Card className="intel-card mb-6">
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>
              What must be true for this hypothesis to hold?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assumptions.map((assumption: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Assumption ${index + 1}`}
                  value={assumption}
                  onChange={(e) =>
                    updateItem(index, e.target.value, assumptions, setAssumptions)
                  }
                />
                {assumptions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index, assumptions, setAssumptions)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem(assumptions, setAssumptions)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add assumption
            </Button>
          </CardContent>
        </Card>

        {/* Signals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Confirm signals */}
          <Card className="intel-card border-intel-border">
            <CardHeader>
              <CardTitle className="text-intel-text">Confirmation signals</CardTitle>
              <CardDescription>
                What evidence would increase your confidence?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {confirmSignals.map((signal: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Signal ${index + 1}`}
                    value={signal}
                    onChange={(e) =>
                      updateItem(index, e.target.value, confirmSignals, setConfirmSignals)
                    }
                  />
                  {confirmSignals.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index, confirmSignals, setConfirmSignals)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(confirmSignals, setConfirmSignals)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add signal
              </Button>
            </CardContent>
          </Card>

          {/* Falsify signals */}
          <Card className="intel-card border-intel-border">
            <CardHeader>
              <CardTitle className="text-intel-text">Falsification signals</CardTitle>
              <CardDescription>
                What evidence would decrease your confidence?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {falsifySignals.map((signal: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Signal ${index + 1}`}
                    value={signal}
                    onChange={(e) =>
                      updateItem(index, e.target.value, falsifySignals, setFalsifySignals)
                    }
                  />
                  {falsifySignals.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index, falsifySignals, setFalsifySignals)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(falsifySignals, setFalsifySignals)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add signal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Review schedule */}
        <Card className="intel-card mb-6">
          <CardHeader>
            <CardTitle>Review schedule</CardTitle>
            <CardDescription>
              When should you revisit this hypothesis?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Next review in {nextReviewDays} days</Label>
              <Slider
                value={[nextReviewDays]}
                onValueChange={([value]: number[]) => setNextReviewDays(value)}
                min={7}
                max={180}
                step={7}
              />
              <p className="text-xs text-intel-muted">
                Set a reminder to review and update this hypothesis
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" asChild>
            <Link href="/hypotheses">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Create hypothesis
          </Button>
        </div>
      </form>

      {/* Help tip */}
      <Card className="intel-card border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-intel-accent shrink-0 mt-0.5" />
            <div className="text-xs text-intel-muted">
              <p className="font-medium text-intel-text mb-1">Analytical discipline</p>
              <p>
                Good hypotheses are specific, falsifiable, and time-bound. After creating,
                you&apos;ll be able to generate red team analysis and pre-mortem scenarios
                to stress-test your thinking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

