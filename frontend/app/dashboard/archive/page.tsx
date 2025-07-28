/**
 * @file page.tsx
 * @description Archive page for viewing and managing archived tasks
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Calendar, AlertCircle } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Components
import { SidebarLayout } from '@/components/parts/SidebarLayout'
import { ArchivedTaskItem } from '@/components/parts/ArchivedTaskItem'

// Hooks and Services
import { useToast } from '@/hooks/use-toast'
import { getArchivedTasks, moveArchivedTaskToToday, deleteArchivedTask } from '@/lib/api/archive'
import { createSchedule } from '@/lib/ScheduleHelper'

// Types
import { type Task } from '@/lib/types'

interface ArchivedTask {
  taskId: string
  archivedAt: string
  task: Task
  originalDate: string
}

/**
 * Archive Page Component
 * Displays all archived tasks for the current user in chronological order
 */
const ArchivePage: React.FC = () => {
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  /**
   * Load archived tasks from the API
   */
  const loadArchivedTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getArchivedTasks()
      
      if (result.success) {
        setArchivedTasks(result.archivedTasks)
      } else {
        throw new Error(result.error || 'Failed to load archived tasks')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load archived tasks'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  /**
   * Handle moving an archived task to today's schedule
   */
  const handleMoveToToday = useCallback(async (taskId: string) => {
    try {
      // Move the task to today via API
      const moveResult = await moveArchivedTaskToToday(taskId)
      
      if (!moveResult.success) {
        throw new Error(moveResult.error || 'Failed to move task to today')
      }

      // Get today's date
      const todayDate = new Date().toISOString().split('T')[0]

      // Check if today's schedule exists, if not create it
      try {
        const scheduleResult = await createSchedule(
          todayDate,
          [moveResult.task!] // Add the moved task
        )

        if (!scheduleResult.success) {
          // If schedule creation fails, try to load existing schedule and add task
          console.warn('Failed to create new schedule, task moved but may need manual addition')
        }
      } catch (scheduleError) {
        console.warn('Schedule operation failed:', scheduleError)
      }

      // Remove the task from archived tasks list
      setArchivedTasks(prev => prev.filter(archived => archived.taskId !== taskId))

      toast({
        title: 'Success',
        description: 'Task moved to today\'s schedule',
        variant: 'default'
      })

      // Optionally redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move task to today'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast, router])

  /**
   * Handle permanently deleting an archived task
   */
  const handleDeleteArchivedTask = useCallback(async (taskId: string) => {
    try {
      const result = await deleteArchivedTask(taskId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete archived task')
      }

      // Remove the task from archived tasks list
      setArchivedTasks(prev => prev.filter(archived => archived.taskId !== taskId))

      toast({
        title: 'Success',
        description: 'Archived task deleted permanently',
        variant: 'default'
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete archived task'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast])

  /**
   * Load archived tasks when component mounts
   */
  useEffect(() => {
    loadArchivedTasks()
  }, [loadArchivedTasks])

  /**
   * Format archive date for display
   */
  const formatArchiveDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Unknown date'
    }
  }, [])

  return (
    <SidebarLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          {/* Page Header */}
          <div className="mb-8 pt-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-container">
                <Archive className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
              {!isLoading && (
                <Badge variant="secondary" className="ml-2">
                  {archivedTasks.length} {archivedTasks.length === 1 ? 'task' : 'tasks'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Manage your archived tasks. Move them back to today's schedule or delete them permanently.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading archived tasks...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="mb-6">
              <CardContent className="flex items-center gap-3 p-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Failed to load archived tasks</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button onClick={loadArchivedTasks} variant="outline" size="sm">
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && archivedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-center max-w-md">
                <Archive className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived tasks yet</h3>
                <p className="text-muted-foreground mb-6">
                  Archive any tasks for future use. Archived tasks can be moved back to your schedule or deleted permanently.
                </p>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Archived Tasks List */}
          {!isLoading && !error && archivedTasks.length > 0 && (
            <div className="space-y-4">
              {archivedTasks.map((archivedTask) => (
                <div key={archivedTask.taskId} className="space-y-2">
                  {/* Archive metadata */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Archived on {formatArchiveDate(archivedTask.archivedAt)}</span>
                    {archivedTask.originalDate && (
                      <>
                        <span>•</span>
                        <span>Originally from {formatArchiveDate(archivedTask.originalDate)}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Archived task item */}
                  <ArchivedTaskItem
                    task={archivedTask.task}
                    onMoveToToday={() => handleMoveToToday(archivedTask.taskId)}
                    onDelete={() => handleDeleteArchivedTask(archivedTask.taskId)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bottom spacing */}
          <div className="h-16" />
        </div>
      </div>
    </SidebarLayout>
  )
}

export default ArchivePage 