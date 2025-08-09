/**
 * @file IntegrationCardShell.tsx
 * @description Reusable shell component to standardize integration card UI
 * Follows TASK-14 requirements: fixed size, single CTA, hover shadow, and
 * tiny connected tick at top-right. Parents control business logic and state.
 */

'use client'

import React from 'react'

// UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, type ButtonProps } from '@/components/ui/button'

// Icons
import { CheckCircle, Loader2 } from 'lucide-react'

// Utils
import { cn } from '@/lib/utils'

/**
 * Button color variant used for the CTA (purple connect vs red disconnect)
 */
type CTAColor = NonNullable<ButtonProps['variant']>

export interface IntegrationCardShellProps {
  /** Top-left icon element (already sized by caller) */
  icon: React.ReactNode
  /** Integration name shown in row 1 */
  name: string
  /** Short description shown in row 2 */
  description: string
  /** Controls the tiny connected tick in top-right */
  connected: boolean
  /** When true, disables CTA and shows spinner */
  isBusy?: boolean
  /** Button label text (e.g., "Connect", "Disconnect", "Connecting…") */
  ctaLabel: string
  /** Button variant color: 'default' (purple) or 'destructive' (red) */
  ctaVariant: CTAColor
  /** Click handler for CTA */
  onCtaClick: () => void | Promise<void>
  /** Optional extra classes for the outer card */
  className?: string
  /** Optional test id passthrough */
  'data-testid'?: string
}

/**
 * IntegrationCardShell – provides a consistent visual structure for
 * integration cards without embedding any service-specific logic.
 */
const IntegrationCardShell: React.FC<IntegrationCardShellProps> = ({
  icon,
  name,
  description,
  connected,
  isBusy = false,
  ctaLabel,
  ctaVariant,
  onCtaClick,
  className,
  ...rest
}) => {
  return (
    <Card
      className={cn(
        // Responsive width: full on mobile, flexible on larger screens
        'w-full max-w-[400px] h-[250px] transition-shadow hover:shadow-lg hover:shadow-black/10',
        'flex flex-col',
        className
      )}
      {...rest}
    >
      {/* Row 1: Icon + Name, with tiny connected tick on the right */}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
          <CardTitle className="text-lg">{name}</CardTitle>
        </div>

        {connected && (
          <div
            className="flex items-center text-green-600"
            aria-label={`${name} connected`}
            title="Connected"
          >
            <CheckCircle className="w-4 h-4" />
          </div>
        )}
      </CardHeader>

      {/* Row 2 + Row 3: Description and single centered CTA */}
      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        <CardDescription className="text-sm">{description}</CardDescription>

        <div className="mt-4 flex justify-start">
          <Button
            onClick={onCtaClick}
            disabled={isBusy}
            variant={ctaVariant}
            size="sm"
            className="min-w-[8rem]"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {ctaLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default IntegrationCardShell


