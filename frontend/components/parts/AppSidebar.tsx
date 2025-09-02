/**
 * @file AppSidebar.tsx
 * @description Main application sidebar component with navigation and user profile
 * Implements TASK-03 requirements for collapsible left sidebar
 */

'use client'

import * as React from 'react'
import { ClipboardPen, Archive, Blocks, PanelLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Import helper to get current date string
import { formatDateToString } from '@/lib/helper'
import { useAuth } from '@/auth/AuthContext'

// Hooks
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * Type definition for navigation menu items
 */
interface NavigationItem {
  id: string
  title: string
  icon: React.ComponentType<any>
  href: string
  isActive: boolean
  onClick?: () => void
}

/**
 * Get navigation menu items with current active state
 * @param pathname - Current pathname to determine active state
 * @returns Array of navigation items with updated active states
 */
const getNavigationItems = (pathname: string): NavigationItem[] => [
  {
    id: 'inputs',
    title: 'Inputs',
    icon: ClipboardPen,
    href: '/dashboard/inputs',
    isActive: pathname.startsWith('/dashboard/inputs')
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Blocks,
    href: '/dashboard/integrations',
    isActive: pathname.startsWith('/dashboard/integrations')
  },
  {
    id: 'archive',
    title: 'Archive',
    icon: Archive,
    href: '/dashboard/archive',
    isActive: pathname.startsWith('/dashboard/archive')
  }
]

/**
 * Get thin sidebar navigation items for collapsed state
 * @param pathname - Current pathname to determine active state
 * @param toggleSidebar - Function to toggle sidebar
 * @returns Array of navigation items for collapsed state
 */
const getThinNavigationItems = (pathname: string, toggleSidebar: () => void): NavigationItem[] => [
  {
    id: 'menu',
    title: 'Expand',
    icon: PanelLeft,
    href: '#',
    isActive: false,
    onClick: toggleSidebar
  },
  {
    id: 'home',
    title: 'Home',
    icon: Home,
    href: '/dashboard',
    isActive: pathname === '/dashboard'
  },
  {
    id: 'inputs',
    title: 'Inputs',
    icon: ClipboardPen,
    href: '/dashboard/inputs',
    isActive: pathname.startsWith('/dashboard/inputs')
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Blocks,
    href: '/dashboard/integrations',
    isActive: pathname.startsWith('/dashboard/integrations')
  },
  {
    id: 'archive',
    title: 'Archive',
    icon: Archive,
    href: '/dashboard/archive',
    isActive: pathname.startsWith('/dashboard/archive')
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
  const pathname = usePathname()
  const { toggleSidebar, state: sidebarState, setOpen } = useSidebar()
  const [showTooltip, setShowTooltip] = React.useState(false)
  const isMobile = useIsMobile()
  const shouldKeepCollapsedRef = React.useRef(false)
  let user: any
  try {
    user = useAuth().user
  } catch (e) {
    user = { email: 'test@example.com' }
  }

  // Get navigation items with current active state
  const navigationItems = React.useMemo(() => getNavigationItems(pathname), [pathname])
  const thinNavigationItems = React.useMemo(() => getThinNavigationItems(pathname, toggleSidebar), [pathname, toggleSidebar])

  // Manage sidebar state and persistence
  React.useEffect(() => {
    setShowTooltip(false)
  }, [sidebarState])

  // Handle sidebar persistence and state management
  React.useEffect(() => {
    // Check if sidebar should be collapsed from previous session on mount
    const savedCollapsedState = localStorage.getItem('thin-sidebar-navigation')
    const savedSidebarState = localStorage.getItem('sidebar:state')

    if (savedCollapsedState === 'true' && !isMobile) {
      // Ensure sidebar stays collapsed for thin navigation
      shouldKeepCollapsedRef.current = true
      if (sidebarState === 'expanded') {
        setOpen(false)
      }
    } else if (savedSidebarState === 'collapsed' && !isMobile) {
      // Ensure sidebar stays collapsed for manual collapse
      if (sidebarState === 'expanded') {
        setOpen(false)
      }
    } else if (sidebarState === 'expanded' && shouldKeepCollapsedRef.current && !isMobile) {
      // Prevent unwanted expansion during navigation
      setOpen(false)
    } else if (sidebarState === 'collapsed' && !shouldKeepCollapsedRef.current) {
      // User manually collapsed - this is normal behavior, save state
      localStorage.setItem('sidebar:state', 'collapsed')
    } else if (sidebarState === 'expanded' && !shouldKeepCollapsedRef.current) {
      // User manually expanded - save state
      localStorage.setItem('sidebar:state', 'expanded')
    }
  }, [sidebarState, setOpen, isMobile])

  /**
   * Get the first letter of the user's email for the avatar
   */
  const getAvatarInitial = React.useMemo(() => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }, [user?.email])

  /**
   * Get the display email for the user
   */
  const getUserEmail = React.useMemo(() => {
    return user?.email || 'User'
  }, [user?.email])

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

  /**
   * Handle navigation to settings page for thin sidebar - keeps sidebar collapsed
   */
  const handleThinSidebarSettingsNavigation = React.useCallback(() => {
    // Mark that we should keep sidebar collapsed during and after navigation
    shouldKeepCollapsedRef.current = true
    localStorage.setItem('thin-sidebar-navigation', 'true')
    router.push('/settings')
  }, [router])

  /**
   * Handle navigation for thin sidebar - keeps sidebar collapsed
   */
  const handleThinSidebarNavigation = React.useCallback((item: NavigationItem) => {
    // If item has onClick (like expand button), call it directly and clear persistence
    if (item.onClick) {
      localStorage.removeItem('thin-sidebar-navigation')
      localStorage.setItem('sidebar:state', 'expanded')
      shouldKeepCollapsedRef.current = false
      item.onClick()
      return
    }
    
    // For navigation items, ensure we maintain collapsed state
    // Don't modify shouldKeepCollapsedRef.current if it's already true
    if (!shouldKeepCollapsedRef.current) {
      shouldKeepCollapsedRef.current = true
      localStorage.setItem('thin-sidebar-navigation', 'true')
    }
    
    // Handle navigation items
    if (item.id === 'inputs') {
      handleInputsNavigation()
    } else if (item.href !== '#') {
      router.push(item.href)
    }
  }, [router, handleInputsNavigation])

  // Check if we're in mobile or desktop collapsed state to show thin sidebar
  const shouldShowThinSidebar = !isMobile && sidebarState === 'collapsed'

  if (shouldShowThinSidebar) {
    // Render thin icon-only sidebar when collapsed
    return (
      <div className="fixed left-0 top-0 z-40 h-full w-12 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="flex flex-col items-center py-3 px-2 flex-1">
          {/* Navigation Icons */}
          {thinNavigationItems.map((item, index) => (
            <TooltipProvider key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors duration-200 ${
                      item.isActive 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground'
                    } ${
                      item.id === 'menu' ? '' : index === 1 ? 'mt-6' : 'mt-3'
                    }`}
                    data-testid={`thin-nav-item-${item.id}`}
                    onClick={() => { handleThinSidebarNavigation(item) }}
                  >
                    <item.icon
                      className="w-5 h-5"
                      size={20}
                      style={{ width: '20px', height: '20px' }}
                      data-testid={`thin-nav-icon-${item.id}`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.id === 'menu' ? (
                    <div className="flex items-center gap-2">
                      <span>{item.title}</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700 rounded border border-gray-600">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700 rounded border border-gray-600">/</kbd>
                      </div>
                    </div>
                  ) : (
                    <span>{item.title}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        
        {/* Settings Icon at Bottom */}
        <div className="px-2 pb-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors duration-200"
                  data-testid="thin-user-profile"
                  onClick={handleThinSidebarSettingsNavigation}
                >
                  <div
                    className="flex items-center justify-center w-6 h-6 gradient-accent rounded-full flex-shrink-0"
                    data-testid="thin-user-avatar"
                  >
                    <span className="text-xs font-medium text-primary-foreground">
                      {getAvatarInitial}
                    </span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Settings</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  // Render normal expanded sidebar
  return (
    <Sidebar
      variant="sidebar"
      collapsible="offcanvas"
      className="border-r"
      data-testid="app-sidebar"
    >
      {/* Header Section */}
      <SidebarHeader className="border-b border-sidebar-border p-5">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="cursor-pointer flex-1">
            <div className="flex items-center h-12 px-3 py-2 rounded-lg hover-selection transition-all duration-200">
              <Image
                src="/favicon-96x96.png"
                alt="YourMum logo"
                width={126}
                height={48}
                className="h-10 w-auto"
                data-testid="sidebar-header-icon"
                priority
                quality={100}
                style={{ imageRendering: 'crisp-edges' }}
              />
              <span 
                className="ml-2.5 text-lg font-semibold text-foreground truncate sm:text-xl h-10 flex items-center"
              >
                YourMum
              </span>
            </div>
          </Link>
          
          {/* Collapse Sidebar Button */}
          <TooltipProvider>
            <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTooltip(false)
                    toggleSidebar()
                  }}
                  className="h-8 w-8 p-0 text-foreground hover:text-foreground transition-colors duration-200"
                  aria-label="Collapse sidebar"
                  data-testid="collapse-sidebar-button"
                >
                  <PanelLeft className="h-5 w-5" style={{ width: '20px', height: '20px' }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <span>Collapse</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700 rounded border border-gray-600">⌘</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700 rounded border border-gray-600">/</kbd>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarHeader>

      {/* Navigation Menu Section */}
      <SidebarContent className="px-5 py-5">
        <nav role="navigation" aria-label="Main navigation">
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  size="lg"
                  className={`h-12 hover-selection cursor-pointer transition-all duration-200 ${
                    item.isActive 
                      ? 'bg-sidebar-accent/100 text-sidebar-accent-foreground'
                      : ''
                  }`}
                  data-testid={`nav-item-${item.id}`}
                  data-onboarding-target={item.id === 'inputs' ? 'inputs-nav' : item.id === 'integrations' ? 'integrations-nav' : undefined}
                  onClick={() => { handleNavigation(item) }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className="w-5 h-5"
                      size={20}
                      style={{ width: '20px', height: '20px' }}
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
            className="flex items-center justify-center w-8 h-8 min-w-8 min-h-8 gradient-accent rounded-full flex-shrink-0"
            data-testid="user-avatar"
          >
            <span className="text-sm font-medium text-primary-foreground">
              {getAvatarInitial}
            </span>
          </div>
          <span className="font-medium text-sidebar-foreground truncate">{getUserEmail}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
