'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Globe,
  LayoutDashboard,
  Newspaper,
  Map,
  Flag,
  Lightbulb,
  BookOpen,
  GitBranch,
  Search,
  TrendingUp,
  Bell,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  FileText,
  MessageSquare,
  Brain,
  Network,
  Github,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore, useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { APP_VERSION, GITHUB_REPO_URL } from '@/lib/constants'

const mainNavItems = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/briefing', label: 'Daily briefing', icon: Newspaper },
  { href: '/map', label: 'World map', icon: Map },
  { href: '/countries', label: 'Countries', icon: Flag },
  { href: '/clusters', label: 'Event clusters', icon: Globe },
  { href: '/articles', label: 'Articles', icon: FileText },
]

const analysisNavItems = [
  { href: '/chat', label: 'Atlas', icon: MessageSquare },
  { href: '/hypotheses', label: 'Hypotheses', icon: Lightbulb },
  { href: '/playbooks', label: 'Playbooks', icon: BookOpen },
  { href: '/graphs', label: 'Causal graphs', icon: GitBranch },
  { href: '/network', label: 'Link Analysis', icon: Network },
  { href: '/research', label: 'Research', icon: Search },
]

const marketsNavItems = [
  { href: '/markets', label: 'Markets', icon: TrendingUp },
  { href: '/markets/geopolitical', label: 'Geopolitical Markets', icon: Globe },
  { href: '/markets/intelligence', label: 'Market Intelligence', icon: Brain },
]

const systemNavItems = [
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/sources', label: 'Sources', icon: Database },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

interface SidebarProps {
  onMobileClose?: () => void
}

export function Sidebar({ onMobileClose }: SidebarProps = {} as SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, toggleSidebar, unreadAlertCount } = useUIStore()
  const { user, isAdmin } = useAuthStore()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavItem = ({
    href,
    label,
    icon: Icon,
    badge,
  }: {
    href: string
    label: string
    icon: typeof LayoutDashboard
    badge?: number
  }) => {
    const isActive = pathname === href || pathname.startsWith(href + '/')

    const content = (
      <Link
        href={href}
        onClick={() => onMobileClose?.()}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          'hover:bg-intel-border/50',
          isActive
            ? 'bg-intel-accent/20 text-intel-accent'
            : 'text-intel-text/70 hover:text-intel-text'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 font-mono">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-classified-red px-1.5 text-xs font-medium text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </>
        )}
      </Link>
    )

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-classified-red px-1.5 text-xs font-medium text-white">
                {badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return content
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-intel-border bg-intel-bg transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
          'lg:relative lg:block'
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-intel-border px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-classified text-lg tracking-wider text-intel-text shrink-0">
                INTELDESK
              </span>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-intel-muted hover:text-intel-accent transition-colors shrink-0"
                title="Ver en GitHub"
              >
                <Github className="h-4 w-4" />
                <span className="text-[10px] font-mono">v{APP_VERSION}</span>
              </a>
            </div>
          )}
          {sidebarCollapsed && (
            <Shield className="h-6 w-6 text-intel-accent mx-auto" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              toggleSidebar()
              onMobileClose?.()
            }}
            className={cn(
              'h-8 w-8 shrink-0',
              sidebarCollapsed && 'mx-auto'
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-[calc(100vh-4rem-4.5rem)]">
            <div className="px-3 py-4">
              <nav className="space-y-6">
            {/* Main Section */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-xs font-mono uppercase tracking-wider text-intel-muted">
                  Intelligence
                </p>
              )}
              {mainNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>

            <Separator className="bg-intel-border" />

            {/* Analysis Section */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-xs font-mono uppercase tracking-wider text-intel-muted">
                  Analysis
                </p>
              )}
              {analysisNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>

            <Separator className="bg-intel-border" />

            {/* Markets Section */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-xs font-mono uppercase tracking-wider text-intel-muted">
                  Markets
                </p>
              )}
              {marketsNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>

            <Separator className="bg-intel-border" />

            {/* System Section */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-xs font-mono uppercase tracking-wider text-intel-muted">
                  System
                </p>
              )}
              {systemNavItems
                .filter((item) => !item.adminOnly || isAdmin())
                .map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    badge={item.href === '/alerts' ? unreadAlertCount : undefined}
                  />
                ))}
            </div>
              </nav>
            </div>
          </ScrollArea>
        </div>

        {/* User Section */}
        <div className="shrink-0 border-t border-intel-border p-3">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-intel-accent/20 text-intel-accent">
                <span className="text-sm font-medium">
                  {user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-intel-text">
                  {user?.fullName || user?.email}
                </p>
                <p className="text-xs font-mono uppercase text-intel-muted">
                  {user?.role}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

