import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // NOTE: Prefer getUser() for auth checks (validated server-side).
  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm', '/']
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(route))
  )

  // API routes that need special handling
  const isApiRoute = pathname.startsWith('/api')
  const isCronRoute = pathname.startsWith('/api/cron')

  // Allow cron routes with secret or manual trigger (development)
  if (isCronRoute) {
    const cronSecret = request.headers.get('x-cron-secret')
    const manualTrigger = request.headers.get('x-manual-trigger')
    
    // Allow if has valid secret OR manual trigger (for development)
    if (cronSecret === process.env.CRON_SECRET || manualTrigger === 'true') {
      return response
    }
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect authenticated users from landing to dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  // Redirect to login if not authenticated and not on public route
  if (!user && !isPublicRoute && !isApiRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if authenticated and on login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

