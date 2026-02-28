'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Newspaper,
  Map,
  Flag,
  Globe,
  Lightbulb,
  BookOpen,
  GitBranch,
  Search,
  TrendingUp,
  Bell,
  Settings,
  Database,
  Plus,
  FileText,
  Brain,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useUIStore, useAuthStore } from '@/lib/store'

const navigationCommands = [
  { href: '/overview', label: 'Go to Overview', icon: LayoutDashboard },
  { href: '/briefing', label: 'Go to Daily Briefing', icon: Newspaper },
  { href: '/map', label: 'Go to World Map', icon: Map },
  { href: '/countries', label: 'Go to Countries', icon: Flag },
  { href: '/clusters', label: 'Go to Event Clusters', icon: Globe },
  { href: '/hypotheses', label: 'Go to Hypotheses', icon: Lightbulb },
  { href: '/playbooks', label: 'Go to Playbooks', icon: BookOpen },
  { href: '/graphs', label: 'Go to Causal Graphs', icon: GitBranch },
  { href: '/research', label: 'Go to Research Mode', icon: Search },
  { href: '/markets', label: 'Go to Markets', icon: TrendingUp },
  { href: '/markets/geopolitical', label: 'Go to Geopolitical Markets', icon: Globe },
  { href: '/markets/intelligence', label: 'Go to Market Intelligence', icon: Brain },
  { href: '/alerts', label: 'Go to Alerts', icon: Bell },
  { href: '/sources', label: 'Go to Sources', icon: Database },
  { href: '/settings', label: 'Go to Settings', icon: Settings, adminOnly: true },
]

const actionCommands = [
  { action: 'new-hypothesis', label: 'Create new hypothesis', icon: Plus },
  { action: 'new-playbook', label: 'Create new playbook', icon: Plus },
  { action: 'new-graph', label: 'Create new causal graph', icon: Plus },
  { action: 'export-briefing', label: 'Export today\'s briefing', icon: FileText },
]

export function CommandPalette() {
  const router = useRouter()
  const { commandPaletteOpen, setCommandPaletteOpen, setResearchQuery } = useUIStore()
  const { isAdmin, canEdit } = useAuthStore()
  const [searchValue, setSearchValue] = useState('')

  const handleSelect = useCallback(
    (value: string) => {
      setCommandPaletteOpen(false)
      setSearchValue('')

      // Navigation commands
      if (value.startsWith('/')) {
        router.push(value)
        return
      }

      // Action commands
      switch (value) {
        case 'new-hypothesis':
          router.push('/hypotheses/new')
          break
        case 'new-playbook':
          router.push('/playbooks/new')
          break
        case 'new-graph':
          router.push('/graphs/new')
          break
        case 'export-briefing':
          sessionStorage.setItem('briefing-export', 'md')
          router.push('/briefing')
          break
        case 'search':
          if (searchValue.trim()) {
            setResearchQuery(searchValue.trim())
            router.push('/research')
          }
          break
      }
    },
    [router, setCommandPaletteOpen, setResearchQuery, searchValue]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>
          {searchValue.trim() ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No results found for &quot;{searchValue}&quot;
              </p>
              <button
                className="text-sm text-intel-accent hover:underline"
                onClick={() => handleSelect('search')}
              >
                Search in Research Mode →
              </button>
            </div>
          ) : (
            'No results found.'
          )}
        </CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navigationCommands
            .filter((cmd) => !cmd.adminOnly || isAdmin())
            .map((cmd) => (
              <CommandItem
                key={cmd.href}
                value={cmd.label}
                onSelect={() => handleSelect(cmd.href)}
              >
                <cmd.icon className="mr-2 h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        {canEdit() && (
          <CommandGroup heading="Actions">
            {actionCommands.map((cmd) => (
              <CommandItem
                key={cmd.action}
                value={cmd.label}
                onSelect={() => handleSelect(cmd.action)}
              >
                <cmd.icon className="mr-2 h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

