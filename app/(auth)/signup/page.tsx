'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Mail, Lock, User, Loader2, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { APP_VERSION, GITHUB_REPO_URL } from '@/lib/constants'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      toast({
        title: 'Check your email',
        description: 'We sent you a confirmation link to complete your registration.',
        variant: 'success',
      })

      router.push('/login')
    } catch (error) {
      toast({
        title: 'Signup failed',
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

      <Card className="w-full max-w-md intel-card relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-intel-accent/20">
              <Shield className="h-8 w-8 text-intel-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl font-classified tracking-wider">
            REQUEST ACCESS
          </CardTitle>
          <CardDescription>
            <span className="flex flex-col items-center gap-1">
              <span>Create an Intel Desk account</span>
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
          <form onSubmit={handleSignup}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-intel-muted" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

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
                    minLength={8}
                    required
                  />
                </div>
                <p className="text-xs text-intel-muted">
                  Must be at least 8 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-intel-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-intel-accent hover:underline">
              Sign in
            </Link>
          </div>
          <div className="text-center text-xs text-intel-muted/50">
            New accounts require admin approval before access is granted.
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

