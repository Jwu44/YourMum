/**
 * @file AppSidebar.tsx
 * @description Main application sidebar component with navigation and user profile
 * Implements TASK-03 requirements for collapsible left sidebar
 */

'use client'

import * as React from 'react'
import { Plus, Archive, Plug } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

// Import helper to get current date string
import { formatDateToString } from '@/lib/helper'

/**
 * Type definition for navigation menu items
 */
interface NavigationItem {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  isActive: boolean
}

/**
 * Navigation menu items configuration
 */
const navigationItems: NavigationItem[] = [
  {
    id: 'inputs',
    title: 'Inputs',
    icon: Plus,
    href: '/dashboard/inputs',
    isActive: false
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Plug,
    href: '/dashboard/integrations',
    isActive: false
  },
  {
    id: 'archive',
    title: 'Archive',
    icon: Archive,
    href: '#',
    isActive: false
  }
]

/**
 * AppSidebar component implementing the left navigation sidebar
 *
 * Features:
 * - Collapsible sidebar with Shadcn UI primitives
 * - Three main sections: Header, Navigation Menu, Footer
 * - Full height layout spanning entire viewport
 * - Responsive design for desktop and mobile
 * - Hover effects and smooth transitions
 * - Dynamic navigation for Inputs page with current date context
 *
 * @returns {JSX.Element} The rendered sidebar component
 */
export function AppSidebar (): JSX.Element {
  const router = useRouter()

  /**
   * Get the current dashboard date from the context
   * This function checks multiple sources to determine the current date:
   * 1. Dashboard persisted date from localStorage
   * 2. Fallback to today's date
   *
   * @returns {string} Date string in YYYY-MM-DD format
   */
  const getCurrentDashboardDate = React.useCallback((): string => {
    try {
      // Try to get persisted dashboard date from localStorage
      const persistedDate = localStorage.getItem('dashboardCurrentDate')
      if (persistedDate && /^\d{4}-\d{2}-\d{2}$/.test(persistedDate)) {
        console.log('Using persisted dashboard date:', persistedDate)
        return persistedDate
      }

      // Fallback to today's date
      const todayDate = formatDateToString(new Date())
      console.log('Using fallback date (today):', todayDate)
      return todayDate
    } catch (error) {
      console.error('Error getting current dashboard date:', error)
      // Fallback to today's date on any error
      return formatDateToString(new Date())
    }
  }, [])

  /**
   * Handle navigation to inputs page with current dashboard date context
   * Uses the current dashboard date instead of just today's date
   */
  const handleInputsNavigation = React.useCallback(() => {
    const currentDate = getCurrentDashboardDate()
    console.log('Navigating to inputs with date:', currentDate)
    router.push(`/dashboard/inputs?date=${currentDate}`)
  }, [router, getCurrentDashboardDate])

  /**
   * Handle navigation for menu items
   * Special handling for inputs page to include date context
   */
  const handleNavigation = React.useCallback((item: NavigationItem) => {
    if (item.id === 'inputs') {
      handleInputsNavigation()
    } else if (item.href !== '#') {
      router.push(item.href)
    }
  }, [router, handleInputsNavigation])

  /**
   * Handle navigation to settings page
   */
  const handleSettingsNavigation = React.useCallback(() => {
    router.push('/settings')
  }, [router])

  return (
    <Sidebar
      variant="sidebar"
      collapsible="offcanvas"
      className="border-r"
      data-testid="app-sidebar"
    >
      {/* Header Section */}
      <SidebarHeader className="border-b border-sidebar-border p-5">
        <Link href="/dashboard" className="cursor-pointer">
          <div className="flex items-center h-12 px-3 py-2 rounded-lg hover-selection transition-all duration-200">
            <Image
              src="/yourdai_logo.png"
              alt="yourdai logo"
              width={126}
              height={24}
              className="h-6 w-auto"
              data-testid="sidebar-header-icon"
              priority
              quality={100}
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation Menu Section */}
      <SidebarContent className="px-5 py-5">
        <nav role="navigation" aria-label="Main navigation">
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 hover-selection cursor-pointer"
                  data-testid={`nav-item-${item.id}`}
                  onClick={() => { handleNavigation(item) }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className="w-5 h-5"
                      data-testid={`nav-icon-${item.id}`}
                    />
                    <span className="font-medium">{item.title}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </nav>
      </SidebarContent>

      {/* Footer Section */}
      <SidebarFooter className="border-t border-sidebar-border p-5">
        <div
          className="flex items-center gap-3 p-3 bg-sidebar-accent/30 rounded-lg mb-2 cursor-pointer hover-selection transition-all duration-200"
          data-testid="user-profile"
          onClick={handleSettingsNavigation}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSettingsNavigation()
            }
          }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 gradient-accent rounded-full"
            data-testid="user-avatar"
          >
            <span className="text-sm font-medium text-primary-foreground">
              U
            </span>
          </div>
          <span className="font-medium text-sidebar-foreground">User</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
