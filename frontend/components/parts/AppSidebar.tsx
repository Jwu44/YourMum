/**
 * @file AppSidebar.tsx
 * @description Main application sidebar component with navigation and user profile
 * Implements TASK-03 requirements for collapsible left sidebar
 */

"use client"

import * as React from "react"
import { Calendar, User, Plus, Archive, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

/**
 * Navigation menu items configuration
 */
const navigationItems = [
  {
    id: "profile",
    title: "Profile",
    icon: User,
    href: "#",
    isActive: false,
  },
  {
    id: "inputs",
    title: "Inputs",
    icon: Plus,
    href: "/inputs",
    isActive: false,
  },
  {
    id: "archive",
    title: "Archive",
    icon: Archive,
    href: "#",
    isActive: false,
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    href: "#",
    isActive: false,
  },
] as const

/**
 * AppSidebar component implementing the left navigation sidebar
 * 
 * Features:
 * - Collapsible sidebar with Shadcn UI primitives
 * - Three main sections: Header, Navigation Menu, Footer
 * - Full height layout spanning entire viewport
 * - Responsive design for desktop and mobile
 * - Hover effects and smooth transitions
 * 
 * @returns {JSX.Element} The rendered sidebar component
 */
export function AppSidebar(): JSX.Element {
  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="offcanvas" 
      className="border-r"
      data-testid="app-sidebar"
    >
      {/* Header Section */}
      <SidebarHeader className="border-b border-sidebar-border p-5">
        <div className="flex items-center gap-2">
          <Calendar 
            className="h-6 w-6 text-primary" 
            data-testid="sidebar-header-icon" 
          />
          <span className="text-lg font-semibold text-sidebar-foreground">
            yourdai
          </span>
        </div>
      </SidebarHeader>

      {/* Navigation Menu Section */}
      <SidebarContent className="px-5 py-5">
        <nav role="navigation" aria-label="Main navigation">
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  className="h-12 transition-colors duration-200 hover:bg-sidebar-accent/50"
                  data-testid={`nav-item-${item.id}`}
                >
                  <a href={item.href} className="flex items-center gap-3">
                    <item.icon 
                      className="w-5 h-5" 
                      data-testid={`nav-icon-${item.id}`}
                    />
                    <span className="font-medium">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </nav>
      </SidebarContent>

      {/* Footer Section */}
      <SidebarFooter className="border-t border-sidebar-border p-5">
        <div 
          className="flex items-center gap-3 p-3 bg-sidebar-accent/30 rounded-lg mb-2"
          data-testid="user-profile"
        >
          <div 
            className="flex items-center justify-center w-8 h-8 bg-primary rounded-full"
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