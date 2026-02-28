'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Globe, ExternalLink, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface NewsItem {
  id: string
  title: string
  url: string
  domain: string
  published_at: string | null
  countries: string[]
  severity?: number
  cluster_id?: string | null
}

interface NewsTickerProps {
  speed?: number // pixels per second
  pauseOnHover?: boolean
}

export function NewsTicker({ speed = 50, pauseOnHover = true }: NewsTickerProps) {
  const [isPaused, setIsPaused] = useState(false)
  const tickerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch recent news articles
  const { data: newsItems, isLoading } = useQuery({
    queryKey: ['news-ticker'],
    queryFn: async () => {
      const response = await fetch('/api/news/ticker')
      if (!response.ok) throw new Error('Failed to fetch news')
      return response.json() as Promise<{ items: NewsItem[] }>
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  })

  // Duplicate items for seamless loop
  const duplicatedItems = newsItems?.items
    ? [...newsItems.items, ...newsItems.items]
    : []

  useEffect(() => {
    if (!tickerRef.current || !contentRef.current || duplicatedItems.length === 0) return

    const ticker = tickerRef.current
    const content = contentRef.current
    let animationFrameId: number
    let position = 0

    const animate = () => {
      if (!isPaused && !isLoading) {
        position -= speed / 60 // Adjust for 60fps
        const contentWidth = content.offsetWidth / 2 // Half because we duplicated

        // Reset position when scrolled past first set
        if (Math.abs(position) >= contentWidth) {
          position = 0
        }

        ticker.style.transform = `translateX(${position}px)`
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [speed, isPaused, isLoading, duplicatedItems.length])

  if (isLoading || !newsItems || newsItems.items.length === 0) {
    return (
      <div className="h-10 bg-intel-border/30 border-b border-intel-border flex items-center px-4">
        <div className="flex items-center gap-2 text-xs text-intel-muted">
          <Globe className="h-3 w-3 animate-pulse" />
          <span>Cargando noticias...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-10 bg-intel-border/30 border-b border-intel-border overflow-hidden relative"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div className="absolute inset-0 flex items-center pointer-events-none z-10">
        <div className="h-full w-20 bg-gradient-to-r from-intel-bg to-transparent absolute left-0" />
        <div className="h-full w-20 bg-gradient-to-l from-intel-bg to-transparent absolute right-0" />
      </div>

      <div
        ref={tickerRef}
        className="flex items-center h-full whitespace-nowrap"
        style={{ willChange: 'transform' }}
      >
        <div ref={contentRef} className="flex items-center gap-6">
          {duplicatedItems.map((item, index) => (
            <Link
              key={`${item.id}-${index}`}
              href={item.cluster_id ? `/clusters/${item.cluster_id}` : `/articles`}
              className="flex items-center gap-3 text-xs text-intel-text hover:text-intel-accent transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.countries.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {item.countries.slice(0, 2).map((country) => (
                      <Badge
                        key={country}
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 border-intel-border/50"
                      >
                        {country}
                      </Badge>
                    ))}
                  </div>
                )}
                <span className="truncate max-w-md font-medium">{item.title}</span>
                <span className="text-intel-muted text-[10px] flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(item.published_at || new Date().toISOString())}
                </span>
                {item.severity && item.severity >= 70 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 h-4 border-red-500/50 text-red-400 shrink-0"
                  >
                    HIGH
                  </Badge>
                )}
                <ExternalLink className="h-3 w-3 text-intel-muted group-hover:text-intel-accent shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="h-4 w-px bg-intel-border/50 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
