'use client'

import React from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

// UI Components
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

// Hooks
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileTopNavProps {
  showUpgradeButton?: boolean
  onSave?: () => void
  isLoading?: boolean
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
  showUpgradeButton = true,
  onSave,
  isLoading = false
}) => {
  const isMobile = useIsMobile()
  const pathname = usePathname()

  // Only render on mobile screens
  if (!isMobile) {
    return null
  }

  // Check if we're on the inputs page
  const isInputsPage = pathname.startsWith('/dashboard/inputs')

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-background/40 backdrop-blur-xl mobile-header-safe z-50">
      <div className="w-full max-w-4xl mx-auto px-4 py-3 mobile-padding-safe">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Left section: Sidebar trigger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <SidebarTrigger className="h-10 w-10 p-2 [&>svg]:!w-5 [&>svg]:!h-5" />
          </div>

          {/* Center section: Empty spacer */}
          <div className="flex-1 min-w-0"></div>

          {/* Right section: Save or Upgrade button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isInputsPage ? (
              /* Save button for inputs page */
              <Button
                onClick={onSave}
                disabled={isLoading}
                size="sm"
                className="h-8 px-4 text-sm font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground mobile-touch-target"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            ) : (
              /* Upgrade button for other pages */
              showUpgradeButton && (
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
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
