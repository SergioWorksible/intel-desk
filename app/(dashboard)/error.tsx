'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-intel-surface p-4">
      <Card className="intel-card max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-intel-text mb-2">Something went wrong</h2>
          <p className="text-sm text-intel-muted text-center mb-6">
            {error.message || 'An unexpected error occurred in the dashboard'}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset} variant="outline">
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/overview">Go to overview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

