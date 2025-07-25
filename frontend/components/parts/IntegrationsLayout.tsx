/**
 * @file IntegrationsPage.tsx
 * @description Integrations page for managing third-party service connections
 * Implements TASK-07 requirements for Slack MCP Server integration
 */

'use client'

import React from 'react'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Icons
import { Plug, Slack } from 'lucide-react'

// Components
import { SidebarLayout } from '@/components/parts/SidebarLayout'
import SlackIntegrationCard from '@/components/parts/SlackIntegrationCard'

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
const IntegrationsPage: React.FC = () => {
  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 pt-8">
          <div className="flex items-center gap-3 mb-4">
            <Plug className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          </div>
          <p className="text-muted-foreground">
            Connect third-party services to streamline your task management workflow
          </p>
        </div>

        {/* Integrations Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrationServices.map((service) => {
            if (service.status === 'available' && service.component) {
              const ServiceComponent = service.component
              return <ServiceComponent key={service.id} />
            } else {
              return <ComingSoonCard key={service.id} service={service} />
            }
          })}
        </div>

        {/* Help Section */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>
                Learn more about setting up integrations and managing your connected services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visit our{' '}
                <a
                  href="#"
                  className="text-primary hover:underline"
                >
                  documentation
                </a>{' '}
                for detailed setup guides and troubleshooting tips.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  )
}

export default IntegrationsPage
