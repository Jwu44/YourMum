/**
 * @file SidebarLayout.tsx
 * @description Layout component that wraps the application with sidebar
 * This component provides the sidebar context and layout structure
 */

'use client'

import * as React from 'react'
import { AppSidebar } from '@/components/parts/AppSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

interface SidebarLayoutProps {
  children: React.ReactNode
}

/**
 * SidebarLayout provides the overall layout structure with sidebar
 *
 * Features:
 * - Wraps the application with SidebarProvider context
 * - Renders the AppSidebar component
 * - Provides main content area with SidebarInset
 * - Includes mobile trigger for responsive behavior
 *
 * @param {SidebarLayoutProps} props - The component props
 * @returns {JSX.Element} The rendered layout component
 */
export function SidebarLayout ({ children }: SidebarLayoutProps): JSX.Element {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Main content area with responsive padding */}
        <div className="flex flex-1 flex-col gap-4 p-3 pt-3 md:p-5 md:pt-5">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
