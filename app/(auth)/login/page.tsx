'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Mail, Lock, Loader2, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { APP_VERSION, GITHUB_REPO_URL } from '@/lib/constants'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')

  const redirect = searchParams.get('redirect') || '/overview'

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: 'Welcome back',
        description: 'You have been successfully logged in.',
        variant: 'success',
      })

      router.push(redirect)
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || ''
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?redirect=${redirect}`,
        },
      })

      if (error) throw error

      toast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Failed to send magic link',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-intel-bg p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      
      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-intel-accent/5 to-transparent animate-scan-line" />
      </div>

      <Card className="w-full max-w-md intel-card relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-intel-accent/20">
              <Shield className="h-8 w-8 text-intel-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl font-classified tracking-wider">
            INTEL DESK
          </CardTitle>
          <CardDescription>
            <span className="flex flex-col items-center gap-1">
              <span>Geopolitical Intelligence System</span>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-intel-muted hover:text-intel-accent transition-colors text-xs mt-1"
              >
                <Github className="h-3.5 w-3.5" />
                <span>v{APP_VERSION}</span>
              </a>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLinkLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-intel-muted" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="analyst@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode === 'password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-intel-muted" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'password' ? 'Sign in' : 'Send magic link'}
              </Button>
            </div>
          </form>

          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
            >
              {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-intel-muted">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-intel-accent hover:underline">
              Request access
            </Link>
          </div>
          <div className="text-center text-xs text-intel-muted/50">
            Authorized personnel only. All access is logged.
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-intel-bg p-4">
        <Card className="w-full max-w-md intel-card relative z-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-intel-accent/20">
                <Shield className="h-8 w-8 text-intel-accent" />
              </div>
            </div>
            <CardTitle className="text-2xl font-classified tracking-wider">
              INTEL DESK
            </CardTitle>
            <CardDescription>
              <span className="flex flex-col items-center gap-1">
                <span>Geopolitical Intelligence System</span>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-intel-muted hover:text-intel-accent transition-colors text-xs mt-1"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>v{APP_VERSION}</span>
                </a>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-intel-accent" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

