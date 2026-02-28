import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Fonts } from '@/components/fonts'

export const metadata: Metadata = {
  title: 'Intel Desk - Geopolitical Intelligence System',
  description: 'Advanced geopolitical and markets intelligence platform with analytical rigor',
  keywords: ['geopolitics', 'intelligence', 'markets', 'analysis'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-hidden">
      <head>
        <Fonts />
      </head>
      <body className="antialiased h-full overflow-hidden" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

