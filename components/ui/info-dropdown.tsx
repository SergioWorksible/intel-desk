'use client'

import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Info } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface InfoDropdownProps {
  title?: string
  content: React.ReactNode
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function InfoDropdown({ title, content, className, side = 'bottom' }: InfoDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-4 w-4 text-intel-muted hover:text-intel-text', className)}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Información</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        className="w-80 bg-intel-surface border-intel-border p-4 space-y-2"
        align="start"
      >
        {title && (
          <h4 className="font-semibold text-sm text-intel-text font-mono">{title}</h4>
        )}
        <div className="text-xs text-intel-muted leading-relaxed">{content}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

