'use client'

import { usePathname } from 'next/navigation'
import { Search, Command, Bell, Clock, Menu, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { APP_VERSION, GITHUB_REPO_URL } from '@/lib/constants'

const pageTitles: Record<string, { title: string; classification?: string }> = {
  '/overview': { title: 'Intelligence overview', classification: 'UNCLASSIFIED' },
  '/briefing': { title: 'Daily briefing', classification: 'FOR OFFICIAL USE' },
  '/map': { title: 'World map', classification: 'UNCLASSIFIED' },
  '/countries': { title: 'Country profiles', classification: 'UNCLASSIFIED' },
  '/clusters': { title: 'Event clusters', classification: 'UNCLASSIFIED' },
  '/hypotheses': { title: 'Hypothesis board', classification: 'ANALYST WORK PRODUCT' },
  '/playbooks': { title: 'Playbooks', classification: 'ANALYST WORK PRODUCT' },
  '/graphs': { title: 'Causal graphs', classification: 'ANALYST WORK PRODUCT' },
  '/research': { title: 'Research mode', classification: 'UNCLASSIFIED' },
  '/markets': { title: 'Markets dashboard', classification: 'UNCLASSIFIED' },
  '/markets/geopolitical': { title: 'Geopolitical markets', classification: 'UNCLASSIFIED' },
  '/markets/intelligence': { title: 'Market intelligence', classification: 'UNCLASSIFIED' },
  '/alerts': { title: 'Alerts & watchlists', classification: 'UNCLASSIFIED' },
  '/sources': { title: 'Source management', classification: 'ADMIN' },
  '/settings': { title: 'System settings', classification: 'ADMIN' },
}

export function Header() {
  const pathname = usePathname()
  const { setCommandPaletteOpen, unreadAlertCount, toggleSidebarMobile } = useUIStore()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Get base path for matching
  const basePath = '/' + (pathname.split('/')[1] || '')
  const pageInfo = pageTitles[basePath] || { title: 'Intel Desk' }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-intel-border bg-intel-bg/95 backdrop-blur px-3 sm:px-4 md:px-6">
      {/* Left: Mobile menu button + Page title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 lg:flex-none">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 shrink-0"
          onClick={toggleSidebarMobile}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1 lg:flex-none">
          <h1 className="text-base sm:text-lg font-mono font-semibold text-intel-text truncate">
            {pageInfo.title}
          </h1>
          {pageInfo.classification && (
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant={
                  pageInfo.classification === 'ADMIN'
                    ? 'classified'
                    : pageInfo.classification === 'ANALYST WORK PRODUCT'
                    ? 'hypothesis'
                    : pageInfo.classification === 'FOR OFFICIAL USE'
                    ? 'warning'
                    : 'outline'
                }
                className="text-[10px] px-1.5 py-0"
              >
                {pageInfo.classification}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search - Hidden on mobile, visible on tablet+ */}
      <div className="hidden md:flex flex-1 max-w-xl mx-4 lg:mx-8">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground h-10"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">Search everything...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>
      </div>

      {/* Mobile search button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9 shrink-0"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Right: Version, GitHub, Time and alerts */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Version + GitHub */}
        <div className="hidden sm:flex items-center gap-2 text-intel-muted">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-intel-accent transition-colors"
            title="Ver en GitHub"
          >
            <Github className="h-4 w-4" />
            <span className="text-xs font-mono">v{APP_VERSION}</span>
          </a>
        </div>
        {/* Current time - Hidden on small mobile */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-intel-muted font-mono">
          <Clock className="h-4 w-4" />
          <span className="hidden md:inline">{formatDateTime(currentTime)}</span>
          <span className="text-xs hidden lg:inline">UTC</span>
        </div>

        {/* Alerts */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-classified-red px-1 text-xs font-medium text-white">
              {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  )
}

