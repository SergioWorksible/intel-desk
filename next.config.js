/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  output: 'standalone',
  experimental: {
    serverActions: {
      // Allow multiple ports for development and production
      allowedOrigins: [
        'localhost:3000',
        'localhost:3001',
        'localhost:3009',
        process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('http://', '') || '',
      ].filter(Boolean),
    },
  },
}

module.exports = nextConfig

