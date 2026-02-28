'use client'

import { useState } from 'react'

interface CountryFlagProps {
  code: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-6', // 4:3 ratio
  md: 'w-10 h-7', // ~3:2 ratio
  lg: 'w-16 h-11', // ~3:2 ratio
}

export function CountryFlag({ code, name, size = 'md', className = '' }: CountryFlagProps) {
  const [error, setError] = useState(false)
  const normalizedCode = code.toLowerCase()
  const flagPath = `/flags/${normalizedCode}.svg`

  if (error) {
    // Fallback to code if flag not found
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center border border-intel-border bg-intel-surface text-xs font-mono text-intel-text ${className}`}
      >
        {code.toUpperCase()}
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center border border-intel-border bg-intel-surface overflow-hidden ${className}`}
    >
      <img
        src={flagPath}
        alt={name || `Flag of ${code}`}
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  )
}

