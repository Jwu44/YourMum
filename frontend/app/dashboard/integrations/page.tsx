/**
 * @file IntegrationsPage.tsx
 * @description Integrations page for managing third-party service connections
 * Implements TASK-07 requirements for Slack MCP Server integration
 */

'use client'

import React from 'react'

// UI Components
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Icons
import { Slack, Calendar } from 'lucide-react'

// Components
import { SidebarLayout } from '@/components/parts/SidebarLayout'
import { MobileTopNav } from '@/components/parts/MobileTopNav'
import SlackIntegrationCard from '@/components/parts/SlackIntegrationCard'
import GoogleCalendarIntegrationCard from '@/components/parts/GoogleCalendarIntegrationCard'

/**
 * Integration service definition
 */
interface IntegrationService {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'available' | 'coming_soon'
  component?: React.ComponentType
}

/**
 * Available integration services
 */
const integrationServices: IntegrationService[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync your calendar events as tasks in your daily schedule',
    icon: Calendar,
    status: 'available',
    component: GoogleCalendarIntegrationCard
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect your Slack workspace to automatically create tasks from @mentions',
    icon: Slack,
    status: 'available',
    component: SlackIntegrationCard
  }
  // Future integrations can be added here
]

/**
 * Coming soon integration placeholder card
 */
const ComingSoonCard: React.FC<{ service: IntegrationService }> = ({ service }) => {
  return (
    <Card className="relative opacity-75">
      <div className="absolute top-2 right-2">
        <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
          Coming Soon
        </span>
      </div>
      <CardHeader className="flex flex-row items-center space-x-4 py-4">
        <div className="p-2 bg-muted rounded-lg">
          <service.icon className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">{service.name}</CardTitle>
          <CardDescription className="text-sm">
            {service.description}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}

/**
 * Main Integrations Page Component
 */
export default function DashboardIntegrationsPage () {
  return (
    <SidebarLayout>
      {/* Mobile Top Navigation */}
      <MobileTopNav showUpgradeButton={true} />

      <div className="flex-1 overflow-y-auto mobile-scroll">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pb-6 mobile-padding-safe pt-16 sm:pt-0">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 pt-4 sm:pt-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Connect third-party services to streamline your task management workflow
          </p>
        </div>

        {/* Integrations Grid */}
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3 justify-items-stretch max-w-none">
          {integrationServices.map((service) => {
            if (service.status === 'available' && service.component) {
              const ServiceComponent = service.component
              return <ServiceComponent key={service.id} />
            } else {
              return <ComingSoonCard key={service.id} service={service} />
            }
          })}
        </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
