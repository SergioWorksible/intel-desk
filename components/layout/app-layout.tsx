'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette } from '@/components/command-palette'
import { NewsTicker } from '@/components/news-ticker'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUIStore, useAuthStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'

interface AppLayoutProps {
  children: React.ReactNode
}

function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-intel-bg overflow-hidden">
      {/* Skeleton Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-intel-border p-4">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto h-screen">
        {/* Skeleton Header */}
        <div className="h-16 border-b border-intel-border flex items-center justify-between px-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        
        {/* Skeleton Content */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="container p-3 sm:p-4 md:p-5">
            <div className="space-y-4">
              <Skeleton className="h-12 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarMobileOpen, setSidebarMobileOpen } = useUIStore()
  const { isInitialized, user } = useAuthStore()

  // Show skeleton only while auth is initializing (first load)
  if (!isInitialized) {
    return <AuthLoadingSkeleton />
  }

  return (
    <div className="flex h-screen bg-intel-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarMobileOpen} onOpenChange={setSidebarMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r border-intel-border bg-intel-bg data-[state=open]:bg-intel-bg">
          <Sidebar onMobileClose={() => setSidebarMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto h-screen">
        <Header />
        <NewsTicker speed={50} pauseOnHover={true} />
        <main className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 104px)' }}>
          <div className="container p-3 sm:p-4 md:p-5">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}

