'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, MessageSquare, BookOpen, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { AtlasMessage } from '@/lib/ai/atlas'

function extractReferences(content: string): Array<{ text: string; type: 'intel' | 'citation'; original: string }> {
  const references: Array<{ text: string; type: 'intel' | 'citation'; original: string }> = []
  
  const intelRefs = content.match(/\[Intel Desk:[^\]]+\]/g) || []
  intelRefs.forEach(ref => {
    const text = ref.replace(/\[Intel Desk:\s*/, '').replace(/\]$/, '').trim()
    references.push({
      text,
      type: 'intel',
      original: ref,
    })
  })
  
  const citationRefs = content.match(/\[\d+\]/g) || []
  citationRefs.forEach(ref => {
    const isPartOfIntel = intelRefs.some(intelRef => intelRef.includes(ref))
    if (!isPartOfIntel) {
      references.push({
        text: ref,
        type: 'citation',
        original: ref,
      })
    }
  })
  
  return references
}

function cleanContent(content: string, references: Array<{ original: string }>): string {
  let cleaned = content
  references.forEach(ref => {
    cleaned = cleaned.replace(ref.original, '')
  })
  // Reemplazar múltiples saltos de línea seguidos por máximo 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  // Reemplazar múltiples espacios (pero no saltos de línea) por un solo espacio
  cleaned = cleaned.replace(/[ ]{2,}/g, ' ')
  // Preservar saltos de línea simples y dobles
  cleaned = cleaned.trim()
  return cleaned
}

export default function ChatPage() {
  const [messages, setMessages] = useState<AtlasMessage[]>([
    {
      role: 'assistant',
      content: 'Hola, soy **Atlas**, tu asistente de inteligencia geopolítica. Estoy conectado a Intel Desk y tengo acceso a los últimos briefings, eventos clave y noticias.\n\n¿Sobre qué te gustaría hablar?',
      timestamp: new Date().toISOString(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/chat/atlas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al obtener respuesta')
      }

      return response.json()
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: data.timestamp,
        },
      ])
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Lo siento, ha ocurrido un error: ${error.message}\n\nPor favor, verifica la configuración de PERPLEXITY_API_KEY.`,
          timestamp: new Date().toISOString(),
        },
      ])
    },
  })

  const handleSend = () => {
    if (!inputValue.trim() || chatMutation.isPending) return

    const userMessage: AtlasMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    chatMutation.mutate(inputValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-5">
      {/* Header */}
      <div className="px-6 py-4 border-b border-intel-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-intel-accent/20">
            <MessageSquare className="h-5 w-5 text-intel-accent" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold text-intel-text">
              Atlas
            </h1>
            <p className="text-sm text-intel-muted">
              Asistente de inteligencia geopolítica
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.map((message, index) => {
            const references = message.role === 'assistant' ? extractReferences(message.content) : []
            const cleanedContent = message.role === 'assistant' 
              ? cleanContent(message.content, references) 
              : message.content
            const isUser = message.role === 'user'

            return (
              <div
                key={index}
                className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isUser 
                    ? 'bg-intel-accent/20 text-intel-accent' 
                    : 'bg-intel-border text-intel-text'
                }`}>
                  {isUser ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </div>

                {/* Message content */}
                <div className={`flex-1 min-w-0 ${isUser ? 'flex items-end flex-col' : ''}`}>
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      isUser
                        ? 'bg-intel-accent/10 border border-intel-accent/20 max-w-[85%]'
                        : 'bg-intel-surface border border-intel-border max-w-full'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm text-intel-text whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <div className="text-sm text-intel-text/90 leading-relaxed">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-3 last:mb-0">{children}</p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="text-intel-text-bright font-semibold">
                                    {children}
                                  </strong>
                                ),
                                em: ({ children }) => (
                                  <em className="text-intel-text-dim italic">{children}</em>
                                ),
                                code: ({ children }) => (
                                  <code className="px-1.5 py-0.5 bg-intel-border text-intel-text-bright text-xs font-mono rounded">
                                    {children}
                                  </code>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc space-y-1 my-3 ml-4">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal space-y-1 my-3 ml-4">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="text-sm">{children}</li>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="text-base font-bold text-intel-text-bright mb-3 mt-4 first:mt-0">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-sm font-bold text-intel-text mb-2 mt-3 first:mt-0">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-sm font-semibold text-intel-text mb-2 mt-2 first:mt-0">
                                    {children}
                                  </h3>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-intel-border pl-3 my-3 text-intel-text-dim italic">
                                    {children}
                                  </blockquote>
                                ),
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-intel-accent hover:underline"
                                  >
                                    {children}
                                  </a>
                                ),
                              }}
                            >
                              {cleanedContent}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {/* Referencias */}
                        {references.length > 0 && (
                          <div className="pt-3 border-t border-intel-border">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-3.5 w-3.5 text-intel-muted" />
                              <span className="text-xs font-mono uppercase text-intel-muted tracking-wider">
                                Referencias
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {references.map((ref, refIndex) => (
                                <Badge
                                  key={refIndex}
                                  variant={ref.type === 'intel' ? 'fact' : 'outline'}
                                  className="text-xs font-mono"
                                >
                                  {ref.type === 'intel' && (
                                    <span className="text-intel-accent mr-1.5">INTEL:</span>
                                  )}
                                  {ref.text}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`text-xs text-intel-muted/60 mt-1 ${isUser ? 'text-right' : ''}`}>
                    {new Date(message.timestamp).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Loading indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-intel-border text-intel-text">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="rounded-lg px-4 py-3 bg-intel-surface border border-intel-border">
                  <div className="flex items-center gap-2 text-intel-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Atlas está pensando...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area - fixed at bottom */}
      <div className="border-t border-intel-border bg-intel-bg px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1"
              disabled={chatMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || chatMutation.isPending}
              size="icon"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-intel-muted/70 mt-2 text-center">
            Atlas puede cometer errores. Verifica información importante.
          </p>
        </div>
      </div>
    </div>
  )
}
