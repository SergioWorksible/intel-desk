import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Globe } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-intel-surface p-4">
      <Card className="intel-card max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-16 w-16 text-intel-muted mb-4" />
          <h2 className="text-xl font-bold text-intel-text mb-2">404 - Page Not Found</h2>
          <p className="text-sm text-intel-muted text-center mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild>
            <Link href="/overview">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

