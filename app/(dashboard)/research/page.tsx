'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUIStore, useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Send,
  Filter,
  X,
  Clock,
  Globe,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface AIResponse {
  answer: string
  key_facts: { text: string; citations: string[] }[]
  analysis: { text: string; citations?: string[] }[]
  uncertainties: string[]
  next_signals: string[]
  confidence: { score: number; rationale: string }
}

interface SearchResult {
  id: string
  title: string
  snippet: string
  url: string
  published_at: string
  source_name: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  response?: AIResponse
}

export default function ResearchPage() {
  const supabase = createClient()
  const { user } = useAuthStore()
  const { researchQuery, setResearchQuery, researchFilters, setResearchFilters, resetResearchFilters } = useUIStore()
  const [inputValue, setInputValue] = useState(researchQuery)
  const [showFilters, setShowFilters] = useState(false)
  const [mode, setMode] = useState<'search' | 'answer' | 'chat'>('chat')
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [usePerplexity, setUsePerplexity] = useState(true)

  // Search articles
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const rpcCall = (supabase.rpc as any)('search_articles', {
        query_text: query,
        limit_count: 50,
      }) as Promise<{ data: any; error: any }>
      const { data, error } = await rpcCall

      if (error) throw error
      return data as SearchResult[]
    },
  })

  // AI answer with conversation history
  const answerMutation = useMutation({
    mutationFn: async (query: string) => {
      const history = conversationHistory.map((m: any) => ({
        role: m.role,
        content: m.role === 'user' ? m.content : m.response?.answer || m.content,
      }))

      const response = await fetch('/api/research/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters: researchFilters,
          usePerplexity,
          conversationHistory: history,
        }),
      })

      if (!response.ok) throw new Error('Failed to get answer')
      return response.json() as Promise<AIResponse>
    },
  })

  const handleSearch = () => {
    if (!inputValue.trim()) return
    setResearchQuery(inputValue)

    if (mode === 'search') {
      searchMutation.mutate(inputValue)
    } else if (mode === 'chat') {
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        role: 'user',
        content: inputValue,
        timestamp: new Date(),
      }
      setConversationHistory((prev) => [...prev, userMessage])
      
      // Get AI response
      answerMutation.mutate(inputValue, {
        onSuccess: (response) => {
          const assistantMessage: ConversationMessage = {
            role: 'assistant',
            content: response.answer,
            timestamp: new Date(),
            response,
          }
          setConversationHistory((prev) => [...prev, assistantMessage])
          setInputValue('')
        },
        onError: () => {
          // Remove user message on error
          setConversationHistory((prev) => prev.slice(0, -1))
        },
      })
    } else {
      answerMutation.mutate(inputValue)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // Sync inputValue with store
  useEffect(() => {
    setInputValue(researchQuery)
  }, [researchQuery])

  const isLoading = searchMutation.isPending || answerMutation.isPending
  const hasResults = searchMutation.data || answerMutation.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-intel-text">
            Research mode
          </h1>
          <p className="text-sm text-intel-muted mt-1">
            Inteligencia avanzada con IA - Análisis profundo tipo CIA/Congreso
          </p>
        </div>
        {mode === 'chat' && conversationHistory.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConversationHistory([])
              setInputValue('')
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar conversación
          </Button>
        )}
      </div>

      {/* Search input */}
      <Card className="intel-card">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-intel-muted" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question or search for topics..."
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Select value={mode} onValueChange={(v) => setMode(v as 'search' | 'answer' | 'chat')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">Chat IA</SelectItem>
                <SelectItem value="answer">Respuesta única</SelectItem>
                <SelectItem value="search">Búsqueda</SelectItem>
              </SelectContent>
            </Select>
            {mode === 'chat' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-intel-border/30 border border-intel-border">
                <input
                  type="checkbox"
                  id="perplexity-toggle"
                  checked={usePerplexity}
                  onChange={(e) => setUsePerplexity(e.target.checked)}
                  className="w-4 h-4 rounded accent-intel-accent"
                />
                <label htmlFor="perplexity-toggle" className="text-xs text-intel-muted cursor-pointer">
                  Perplexity
                </label>
              </div>
            )}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="icon"
              className="h-12 w-12"
            >
              <Filter className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleSearch}
              disabled={!inputValue.trim() || isLoading}
              className="h-12 px-6"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-intel-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-intel-text">Filters</span>
                <Button variant="ghost" size="sm" onClick={resetResearchFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-intel-muted">Min severity</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={researchFilters.minSeverity}
                    onChange={(e) =>
                      setResearchFilters({ minSeverity: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-intel-muted">Min confidence</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={researchFilters.minConfidence}
                    onChange={(e) =>
                      setResearchFilters({ minConfidence: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-intel-muted">From date</label>
                  <Input
                    type="date"
                    value={researchFilters.dateRange.from || ''}
                    onChange={(e) =>
                      setResearchFilters({
                        dateRange: { ...researchFilters.dateRange, from: e.target.value || null },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-intel-muted">To date</label>
                  <Input
                    type="date"
                    value={researchFilters.dateRange.to || ''}
                    onChange={(e) =>
                      setResearchFilters({
                        dateRange: { ...researchFilters.dateRange, to: e.target.value || null },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat mode conversation */}
      {mode === 'chat' && (
        <Card className="intel-card">
          <CardContent className="p-6">
            <ScrollArea className="h-[600px] pr-4">
              {conversationHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-16 w-16 text-intel-muted mb-4" />
                  <h3 className="text-lg font-medium text-intel-text mb-2">
                    Modo de investigación avanzada
                  </h3>
                  <p className="text-sm text-intel-muted max-w-md">
                    Haz preguntas complejas y mantén una conversación con el analista de IA. 
                    El sistema combina tu base de datos de inteligencia con investigación en tiempo real.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {conversationHistory.map((message: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex gap-4 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-intel-accent/20 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-intel-accent" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-intel-accent/20 text-intel-text'
                            : 'bg-intel-border/30 text-intel-text'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="text-sm">{message.content}</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                            {message.response && (
                              <>
                                {message.response.key_facts.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-intel-border">
                                    <p className="text-xs font-mono text-intel-muted mb-2">Hechos clave:</p>
                                    <ul className="space-y-1 text-xs">
                                      {message.response.key_facts.map((fact: any, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                                          <span>{fact.text}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-intel-border">
                                  <Badge
                                    variant={
                                      message.response.confidence.score >= 70
                                        ? 'success'
                                        : message.response.confidence.score >= 40
                                        ? 'warning'
                                        : 'error'
                                    }
                                    className="text-xs"
                                  >
                                    Confianza: {message.response.confidence.score}%
                                  </Badge>
                                  {usePerplexity && (
                                    <Badge variant="outline" className="text-xs">
                                      <Globe className="h-3 w-3 mr-1" />
                                      Perplexity
                                    </Badge>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-intel-accent flex items-center justify-center">
                          <span className="text-xs font-bold text-white">U</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-intel-accent/20 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-intel-accent" />
                      </div>
                      <div className="bg-intel-border/30 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-intel-accent animate-pulse" />
                          <span className="text-sm text-intel-muted">Analizando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {mode !== 'chat' && isLoading && (
        <Card className="intel-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <SkeletonText lines={5} />
              <Separator className="my-4" />
              <SkeletonText lines={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer mode results */}
      {mode !== 'chat' && !isLoading && answerMutation.data && mode === 'answer' && (
        <div className="space-y-4">
          {/* Main answer */}
          <Card className="intel-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-intel-accent" />
                  Answer
                </CardTitle>
                <Badge
                  variant={
                    answerMutation.data.confidence.score >= 70
                      ? 'success'
                      : answerMutation.data.confidence.score >= 40
                      ? 'warning'
                      : 'error'
                  }
                >
                  {answerMutation.data.confidence.score}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{answerMutation.data.answer}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Key facts */}
          {answerMutation.data.key_facts.length > 0 && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Key facts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {answerMutation.data.key_facts.map((fact: any, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge variant="fact" className="mt-0.5">FACT</Badge>
                      <div>
                        <p className="text-sm text-intel-text">{fact.text}</p>
                        {fact.citations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {fact.citations.map((c: string, j: number) => (
                              <span key={j} className="citation">[{j + 1}]</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Analysis */}
          {answerMutation.data.analysis.length > 0 && (
            <Card className="intel-card">
              <CardHeader>
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <Search className="h-4 w-4 text-amber-400" />
                  Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {answerMutation.data.analysis.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge variant="inference" className="mt-0.5">INFERENCE</Badge>
                      <p className="text-sm text-intel-text/80">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Uncertainties and signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {answerMutation.data.uncertainties.length > 0 && (
              <Card className="intel-card">
                <CardHeader>
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-intel-muted" />
                    Uncertainties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {answerMutation.data.uncertainties.map((u: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-intel-text/70">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {answerMutation.data.next_signals.length > 0 && (
              <Card className="intel-card">
                <CardHeader>
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-intel-accent" />
                    Signals to watch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {answerMutation.data.next_signals.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-intel-text/70">
                        <span className="text-intel-accent">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Confidence rationale */}
          <Card className="intel-card border-dashed">
            <CardContent className="p-4">
              <p className="text-xs font-mono text-intel-muted">
                <strong>Confidence rationale:</strong> {answerMutation.data.confidence.rationale}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search mode results */}
      {mode !== 'chat' && !isLoading && searchMutation.data && mode === 'search' && (
        <Card className="intel-card">
          <CardHeader>
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Search className="h-4 w-4 text-intel-accent" />
              Search results ({searchMutation.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchMutation.data.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {searchMutation.data.map((result: any) => (
                    <div
                      key={result.id}
                      className="p-4 rounded-lg bg-intel-border/30 hover:bg-intel-border/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-intel-text hover:text-intel-accent"
                          >
                            {result.title}
                            <ExternalLink className="inline-block ml-1 h-3 w-3" />
                          </a>
                          <p className="text-sm text-intel-text/70 mt-1 line-clamp-2">
                            {result.snippet}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-intel-muted">
                            <span>{result.source_name}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(result.published_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-intel-muted">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p>No results found</p>
                <p className="text-xs">Try different keywords or adjust filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {mode !== 'chat' && !isLoading && !hasResults && (
        <Card className="intel-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-intel-muted mb-4" />
            <h3 className="text-lg font-medium text-intel-text mb-2">
              Pregunta cualquier cosa
            </h3>
            <p className="text-sm text-intel-muted text-center max-w-md">
              Busca en todas las fuentes de inteligencia o haz preguntas para obtener respuestas fundamentadas y citadas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

