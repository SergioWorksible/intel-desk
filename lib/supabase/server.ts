import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * Creates a Supabase client for server-side use (Server Components, Route Handlers).
 * Respects user authentication via cookies.
 * 
 * Supports both new API keys (publishable) and legacy keys (anon).
 * New keys take precedence if both are provided.
 * 
 * @see https://github.com/orgs/supabase/discussions/29260
 */
export function createClient() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Prefer new publishable key, fallback to legacy anon key
  const key = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      'Missing Supabase API key. Please set either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
      '(recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) in your environment variables.'
    )
  }

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server component - ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase service client with elevated privileges.
 * Bypasses Row Level Security (RLS) - use only in secure backend contexts.
 * 
 * Supports both new API keys (secret) and legacy keys (service_role).
 * New keys take precedence if both are provided.
 * 
 * @see https://github.com/orgs/supabase/discussions/29260
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Prefer new secret key, fallback to legacy service_role key
  const key = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      'Missing Supabase service key. Please set either SUPABASE_SECRET_KEY ' +
      '(recommended) or SUPABASE_SERVICE_ROLE_KEY (legacy) in your environment variables.'
    )
  }

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  )
}

