'use client'

import React from 'react'
import Image from 'next/image'

// UI Components
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

// Hooks
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileTopNavProps {
  showUpgradeButton?: boolean
}

/**
 * Mobile-only top navigation component for dashboard subpages
 *
 * Provides consistent mobile navigation with:
 * - Left: Sidebar trigger button
 * - Center: Page title
 * - Right: Upgrade to Pro button
 *
 * Only renders on mobile screens (< 768px)
 */
export const MobileTopNav: React.FC<MobileTopNavProps> = ({
  showUpgradeButton = true
}) => {
  const isMobile = useIsMobile()

  // Only render on mobile screens
  if (!isMobile) {
    return null
  }

  return (
    <div className="w-full bg-background mobile-header-safe">
      <div className="w-full max-w-4xl mx-auto px-3 mobile-padding-safe">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Left section: Sidebar trigger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <SidebarTrigger className="h-10 w-10 p-2 [&>svg]:!w-5 [&>svg]:!h-5" />
          </div>

          {/* Center section: Empty spacer */}
          <div className="flex-1 min-w-0"></div>

          {/* Right section: Upgrade button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showUpgradeButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 bg-muted/50 hover:bg-muted text-sm font-medium rounded-full border border-border/50 mobile-touch-target flex items-center gap-2"
              >
                {/* YourMum Logo */}
                <Image
                  src="/favicon-96x96.png"
                  alt="YourMum logo"
                  width={16}
                  height={16}
                  className="h-4 w-4"
                  priority
                  quality={100}
                  style={{ imageRendering: 'crisp-edges' }}
                />
                <span className="text-foreground">Upgrade to </span>
                <span className="text-purple-pastel font-semibold">Pro</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
