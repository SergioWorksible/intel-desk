'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore, useUIStore } from '@/lib/store'
import { Toaster } from '@/components/ui/toaster'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser, setLoading, setInitialized } = useAuthStore()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let active = true

    const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      const timeout = new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      return (await Promise.race([promise, timeout])) as T
    }

    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await withTimeout(supabase.auth.getUser(), 5000)
        if (!active) return

        if (error || !data?.user) {
          clearUser()
          setInitialized(true)
          return
        }

        const u = data.user

        try {
          const profileQuery = supabase.from('profiles').select('*').eq('id', u.id).single()
          const { data: profile, error: profileError } = await withTimeout(
            profileQuery as unknown as Promise<{ data: any; error: any }>,
            5000
          )

          if (!active) return

          if (!profileError && profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              role: profile.role,
              fullName: profile.full_name,
            })
          } else {
            setUser({
              id: u.id,
              email: u.email || '',
              role: 'reader',
              fullName: (u.user_metadata as any)?.full_name || null,
            })
          }
        } catch {
          if (!active) return
          setUser({
            id: u.id,
            email: u.email || '',
            role: 'reader',
            fullName: (u.user_metadata as any)?.full_name || null,
          })
        } finally {
          if (active) setInitialized(true)
        }
      } catch {
        if (!active) return
        clearUser()
        setInitialized(true)
      }
    }

    load()

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return
      if (event === 'SIGNED_OUT') {
        clearUser()
        setInitialized(true)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        load()
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [supabase, setUser, clearUser, setLoading, setInitialized])

  return <>{children}</>
}

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const user = useAuthStore((state) => state.user)
  const incrementUnreadAlerts = useUIStore((state) => state.incrementUnreadAlerts)

  useEffect(() => {
    if (!user) return

    // Subscribe to alert events
    const channel = supabase
      .channel('alert-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_events',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          incrementUnreadAlerts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user, incrementUnreadAlerts])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Debug: Log provider mount
  useEffect(() => {
    // Intentionally empty: keep effect slot for future debugging if needed
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AuthProvider>
          <RealtimeProvider>
            {children}
            <Toaster />
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

