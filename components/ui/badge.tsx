import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Console-style badges - grayscale only
        fact: 'border-intel-border bg-intel-surface text-intel-text font-mono uppercase tracking-wide rounded-none',
        inference: 'border-intel-border bg-intel-surface text-intel-text-dim font-mono uppercase tracking-wide rounded-none',
        hypothesis: 'border-intel-muted bg-intel-surface text-intel-text font-mono uppercase tracking-wide rounded-none',
        classified: 'border-intel-border bg-intel-bg text-intel-text-bright font-mono uppercase tracking-wide rounded-none',
        success: 'border-intel-border bg-intel-surface text-intel-text rounded-none',
        warning: 'border-intel-border bg-intel-surface text-intel-text-dim rounded-none',
        error: 'border-intel-border bg-intel-surface text-intel-text rounded-none',
        info: 'border-intel-border bg-intel-surface text-intel-text-dim rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

