import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

// Singleton instance for browser client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Supabase browser client.
 *
 * Note: with modern @supabase/ssr we don't need cookie hacks in the browser.
 * The client makes requests normally (REST/Realtime/Auth) and the
 * server/middleware handles the session via cookies.
 */
export function createClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment variables')
  }

  if (!key) {
    throw new Error(
      'Missing Supabase API key. Please set either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        '(recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) in your environment variables.'
    )
  }

  browserClient = createBrowserClient<Database>(url, key)
  return browserClient
}

