'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Loader2, Search, ExternalLink } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function PerplexityNewsWidget() {
  const supabase = createClient()
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('es')
  const [countrySearch, setCountrySearch] = useState('')

  // Fetch countries for dropdown
  const { data: countries, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('countries')
        .select('code, name')
        .order('name')

      if (error) throw error
      return data || []
    },
  })

  // Fetch Perplexity news
  const {
    data: newsData,
    isLoading: newsLoading,
    refetch: refetchNews,
    isFetching: newsFetching,
  } = useQuery({
    queryKey: ['perplexity-news', selectedCountry, selectedCity, selectedLanguage],
    queryFn: async () => {
      if (!selectedCountry) return null

      const params = new URLSearchParams({ country: selectedCountry, language: selectedLanguage })
      if (selectedCity) {
        params.append('city', selectedCity)
      }

      const response = await fetch(`/api/perplexity/news?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch news')
      }
      return response.json()
    },
    enabled: !!selectedCountry,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const filteredCountries = countries?.filter((country: { name: string; code: string }) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  return (
    <Card className="intel-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-mono flex items-center gap-1.5 uppercase tracking-wider">
            <Search className="h-3 w-3 text-intel-accent" />
            Country News
          </CardTitle>
          {newsData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchNews()}
              disabled={newsFetching}
            >
              {newsFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-2.5">
          <div>
            <Label htmlFor="country-select" className="text-[10px] font-mono text-intel-muted mb-1.5 block uppercase tracking-wide">
              País *
            </Label>
            {countriesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select 
                value={selectedCountry} 
                onValueChange={setSelectedCountry}
                onOpenChange={(open) => {
                  // Limpiar búsqueda cuando se cierra el select
                  if (!open) {
                    setCountrySearch('')
                  }
                }}
              >
                <SelectTrigger id="country-select" className="w-full">
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Buscar país..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="h-8 text-xs"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        // Prevenir que Enter cierre el select cuando se está buscando
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                        }
                      }}
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredCountries?.map((country: { code: string; name: string }) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="city-input" className="text-[10px] font-mono text-intel-muted mb-1.5 block uppercase tracking-wide">
              Ciudad (opcional)
            </Label>
            <Input
              id="city-input"
              placeholder="Ej: Madrid, Barcelona..."
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="language-select" className="text-[10px] font-mono text-intel-muted mb-1.5 block uppercase tracking-wide">
              Idioma
            </Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger id="language-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedCountry && (newsLoading || newsFetching) && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-intel-muted py-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Consultando...</span>
            </div>
          )}
        </div>

        {/* News Results */}
        {newsLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {newsData && !newsLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-intel-muted font-mono uppercase tracking-wide pb-1.5 border-b border-intel-border/30">
              <span>
                {newsData.location}
              </span>
              <span>{formatRelativeTime(newsData.fetchedAt)}</span>
            </div>

            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-1.5 font-mono text-xs text-intel-text leading-relaxed">
                {newsData.summary.split(/\n\n+/).map((paragraph: string, idx: number) => {
                  if (!paragraph.trim()) return null
                  
                  // Detectar títulos markdown
                  if (paragraph.match(/^#{1,3}\s/)) {
                    const level = paragraph.match(/^(#{1,3})/)?.[1].length || 1
                    const text = paragraph.replace(/^#{1,3}\s/, '').trim()
                    const className = level === 1 
                      ? 'text-sm font-bold text-intel-accent mt-2 mb-1.5 tracking-wider border-b border-intel-border/30 pb-1' 
                      : level === 2
                      ? 'text-sm font-semibold text-intel-text mt-1.5 mb-1'
                      : 'text-sm font-semibold text-intel-text mt-1 mb-0.5'
                    return <div key={idx} className={className}>{text}</div>
                  }
                  
                  // Detectar títulos sin markdown (ej: "Key Developments")
                  if (paragraph.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/) && paragraph.length < 50 && !paragraph.includes(' - ')) {
                    return (
                      <div key={idx} className="text-xs font-bold text-intel-accent mt-2 mb-1.5 uppercase tracking-wider border-b border-intel-border/30 pb-1">
                        {paragraph.trim()}
                      </div>
                    )
                  }
                  
                  // Detectar categorías con " - " (ej: "Seguridad & Defensa / Breaking News -")
                  if (paragraph.includes(' - ') && !paragraph.match(/^[\-\*]\s/)) {
                    const match = paragraph.match(/^([^-\n]+?)\s*-\s(.+)/)
                    if (match) {
                      const category = match[1].trim()
                      let content = match[2].trim()
                      
                      // Procesar fuentes en el contenido
                      const sourcePattern = /\[([^\]]+)\](\[\d+\])+/g
                      const sources: string[] = []
                      content = content.replace(sourcePattern, (match, sourceName) => {
                        if (!sources.includes(sourceName)) {
                          sources.push(sourceName)
                        }
                        return ''
                      }).trim()
                      
                      // Procesar negritas en el contenido
                      const contentParts = content.split(/(\*\*.*?\*\*)/g)
                      
                      return (
                        <div key={idx} className="mb-1.5 flex flex-wrap items-start gap-1.5">
                          <span className="text-[14px] font-bold text-intel-accent tracking-wide flex-shrink-0">{category}</span>
                          <span className="text-[14px] text-intel-muted">—</span>
                          <span className="text-xs text-intel-text flex-1 min-w-0">
                            {contentParts.map((part, partIdx) => {
                              if (part.match(/\*\*(.*?)\*\*/)) {
                                const boldText = part.replace(/\*\*/g, '')
                                return <strong key={partIdx} className="font-semibold">{boldText}</strong>
                              }
                              return <span key={partIdx}>{part}</span>
                            })}
                          </span>
                          {sources.length > 0 && (
                            <span className="flex flex-wrap gap-1 flex-shrink-0">
                              {sources.map((source, sourceIdx) => (
                                <button
                                  key={sourceIdx}
                                  onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(source)}`, '_blank')}
                                  className="text-[10px] px-1.5 py-0.5 bg-intel-border/60 hover:bg-intel-border/80 text-intel-muted hover:text-intel-accent rounded font-mono transition-colors cursor-pointer"
                                  title={`Buscar ${source}`}
                                >
                                  {source}
                                </button>
                              ))}
                            </span>
                          )}
                        </div>
                      )
                    }
                  }
                  
                  // Detectar listas con " - " al inicio
                  if (paragraph.match(/^[\-\*]\s/) || paragraph.match(/^\d+\.\s/)) {
                    const items = paragraph.split('\n').filter(l => l.trim())
                    return (
                      <div key={idx} className="space-y-0.5">
                        {items.map((item, itemIdx) => {
                          let text = item.replace(/^[\-\*]\s/, '').replace(/^\d+\.\s/, '').trim()
                          
                          // Extraer fuentes [fuente][número] y convertirlas en badges
                          const sourcePattern = /\[([^\]]+)\](\[\d+\])+/g
                          const sources: string[] = []
                          text = text.replace(sourcePattern, (match, sourceName) => {
                            if (!sources.includes(sourceName)) {
                              sources.push(sourceName)
                            }
                            return ''
                          }).trim()
                          
                          // Procesar negritas
                          const parts = text.split(/(\*\*.*?\*\*)/g)
                          
                          return (
                            <div key={itemIdx} className="text-xs leading-relaxed flex flex-wrap items-start gap-1.5">
                              <span className="text-intel-muted mr-1 text-[10px] flex-shrink-0">•</span>
                              <span className="flex-1 min-w-0">
                                {parts.map((part, partIdx) => {
                                  if (part.match(/\*\*(.*?)\*\*/)) {
                                    const boldText = part.replace(/\*\*/g, '')
                                    return <strong key={partIdx} className="font-semibold text-intel-text">{boldText}</strong>
                                  }
                                  return <span key={partIdx}>{part}</span>
                                })}
                              </span>
                              {sources.length > 0 && (
                                <span className="flex flex-wrap gap-1 ml-1 flex-shrink-0">
                                  {sources.map((source, sourceIdx) => (
                                    <button
                                      key={sourceIdx}
                                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(source)}`, '_blank')}
                                      className="text-[10px] px-1.5 py-0.5 bg-intel-border/60 hover:bg-intel-border/80 text-intel-muted hover:text-intel-accent rounded font-mono transition-colors cursor-pointer"
                                      title={`Buscar ${source}`}
                                    >
                                      {source}
                                    </button>
                                  ))}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                  
                  // Párrafo normal - procesar fuentes y links
                  let processedText = paragraph.trim()
                  
                  // Extraer fuentes [fuente][número] y guardarlas
                  const sourceMatches: Array<{ source: string; fullMatch: string }> = []
                  const sourcePattern = /\[([^\]]+)\](\[\d+\])+/g
                  let match
                  while ((match = sourcePattern.exec(paragraph)) !== null) {
                    const sourceName = match[1]
                    if (!sourceMatches.find(s => s.source === sourceName)) {
                      sourceMatches.push({
                        source: sourceName,
                        fullMatch: match[0]
                      })
                    }
                  }
                  
                  // Remover fuentes del texto principal
                  processedText = processedText.replace(sourcePattern, '').trim()
                  
                  // Si el párrafo está vacío después de remover fuentes, solo mostrar las fuentes
                  if (!processedText && sourceMatches.length > 0) {
                    return (
                      <div key={idx} className="flex flex-wrap gap-1 mb-1">
                        {sourceMatches.map((src, srcIdx) => (
                          <button
                            key={srcIdx}
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(src.source)}`, '_blank')}
                            className="text-[10px] px-1.5 py-0.5 bg-intel-border/60 hover:bg-intel-border/80 text-intel-muted hover:text-intel-accent rounded font-mono transition-colors cursor-pointer"
                            title={`Buscar ${src.source}`}
                          >
                            {src.source}
                          </button>
                        ))}
                      </div>
                    )
                  }
                  
                  // Procesar negritas y links
                  const parts = processedText.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g)
                  
                  return (
                    <div key={idx} className="text-xs leading-relaxed mb-1.5 flex flex-wrap items-start gap-1.5">
                      <span className="flex-1 min-w-0">
                        {parts.map((part, partIdx) => {
                          // Negritas
                          if (part.match(/\*\*(.*?)\*\*/)) {
                            const boldText = part.replace(/\*\*/g, '')
                            return <strong key={partIdx} className="font-semibold">{boldText}</strong>
                          }
                          // Links markdown
                          const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/)
                          if (linkMatch) {
                            return (
                              <a
                                key={partIdx}
                                href={linkMatch[2]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-intel-accent hover:underline inline-flex items-center gap-1"
                              >
                                <span>{linkMatch[1]}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )
                          }
                          return <span key={partIdx}>{part}</span>
                        })}
                      </span>
                      {sourceMatches.length > 0 && (
                        <span className="flex flex-wrap gap-1 flex-shrink-0">
                          {sourceMatches.map((src, srcIdx) => (
                            <button
                              key={srcIdx}
                              onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(src.source)}`, '_blank')}
                              className="text-[10px] px-1.5 py-0.5 bg-intel-border/60 hover:bg-intel-border/80 text-intel-muted hover:text-intel-accent rounded font-mono transition-colors cursor-pointer"
                              title={`Buscar ${src.source}`}
                            >
                              {src.source}
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="pt-2 border-t border-intel-border text-[10px] text-intel-muted font-mono">
              <p>
                Fuente: Perplexity AI • Actualizado {formatRelativeTime(newsData.fetchedAt)}
              </p>
            </div>
          </div>
        )}

        {!selectedCountry && !newsLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-intel-muted">
            <Search className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-[10px] font-mono">Selecciona un país para ver noticias</p>
            <p className="text-[9px] font-mono mt-1 text-intel-muted/70">Fuentes verificadas de Perplexity</p>
          </div>
        )}

        {newsData?.error && (
          <div className="text-[10px] font-mono text-red-400 p-2 rounded bg-red-500/10 border border-red-500/20">
            <p className="font-semibold mb-0.5">Error al obtener noticias</p>
            <p className="text-[9px]">{newsData.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
