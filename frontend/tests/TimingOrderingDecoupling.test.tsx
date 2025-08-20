/**
 * @file TimingOrderingDecoupling.test.tsx
 * @description Tests for the two-step timing and ordering pattern selection
 * 
 * Following TDD principles: These tests define the expected behavior
 * before implementing the actual feature.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FormProvider } from '@/lib/FormContext'
import InputsConfig from '@/components/parts/InputsConfig'

// Mock the router and navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn(() => '2024-01-01')
  }),
  usePathname: () => '/dashboard/inputs'
}))

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock auth context
jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    loading: false,
    error: null
  })
}))

// Mock schedule helpers
jest.mock('@/lib/ScheduleHelper', () => ({
  generateSchedule: jest.fn(),
  loadSchedule: jest.fn(() => Promise.resolve({ success: false, schedule: [] }))
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div'
  },
  Reorder: {
    Group: ({ children }: any) => <div>{children}</div>,
    Item: ({ children }: any) => <div>{children}</div>
  }
}))

const renderWithFormProvider = (component: React.ReactElement) => {
  return render(
    <FormProvider>
      {component}
    </FormProvider>
  )
}

describe('TimingOrderingDecoupling', () => {
  describe('Two-Step UI Selection', () => {
    it('should display Step 1: Time Management section', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        expect(screen.getByText('Time Management')).toBeInTheDocument()
        expect(screen.getByText('Timeboxed')).toBeInTheDocument()
        expect(screen.getByText('Tasks with specific time allocations')).toBeInTheDocument()
        expect(screen.getByText('Untimeboxed')).toBeInTheDocument()
        expect(screen.getByText('Tasks without specific times')).toBeInTheDocument()
      })
    })

    it('should display Step 2: Task Ordering Pattern section as optional', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        expect(screen.getByText('Task Ordering Pattern')).toBeInTheDocument()
        expect(screen.getByText('Optional')).toBeInTheDocument()
        expect(screen.getByText('Batching')).toBeInTheDocument()
        expect(screen.getByText('Alternating')).toBeInTheDocument()
        expect(screen.getByText('3-3-3')).toBeInTheDocument()
      })
    })

    it('should have clear visual separation between Step 1 and Step 2', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const step1Section = screen.getByText('Time Management').closest('[data-testid], [class*="card"], section, div')
        const step2Section = screen.getByText('Task Ordering Pattern').closest('[data-testid], [class*="card"], section, div')
        
        expect(step1Section).toBeInTheDocument()
        expect(step2Section).toBeInTheDocument()
        expect(step1Section).not.toBe(step2Section)
      })
    })
  })

  describe('Timing Selection (Step 1)', () => {
    it('should allow selecting timebox option', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const timeboxOption = screen.getByText('Timeboxed').closest('.timing-card')
        fireEvent.click(timeboxOption!)
        
        expect(timeboxOption).toHaveClass('timing-card-selected')
      })
    })

    it('should allow selecting untimebox option', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const untimeboxOption = screen.getByText('Untimeboxed').closest('.timing-card')
        fireEvent.click(untimeboxOption!)
        
        expect(untimeboxOption).toHaveClass('timing-card-selected')
      })
    })

    it('should default to untimebox selection', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const untimeboxOption = screen.getByText('Untimeboxed').closest('.timing-card')
        expect(untimeboxOption).toHaveClass('timing-card-selected')
      })
    })
  })

  describe('Ordering Pattern Selection (Step 2)', () => {
    it('should allow selecting batching pattern', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const batchingOption = screen.getByText('Batching').closest('.ordering-card')
        fireEvent.click(batchingOption!)
        
        expect(batchingOption).toHaveClass('ordering-card-selected')
      })
    })

    it('should allow selecting alternating pattern', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const alternatingOption = screen.getByText('Alternating').closest('.ordering-card')
        fireEvent.click(alternatingOption!)
        
        expect(alternatingOption).toHaveClass('ordering-card-selected')
      })
    })

    it('should allow selecting 3-3-3 pattern', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const threeThreeThreeOption = screen.getByText('3-3-3').closest('.ordering-card')
        fireEvent.click(threeThreeThreeOption!)
        
        expect(threeThreeThreeOption).toHaveClass('ordering-card-selected')
      })
    })

    it('should allow deselecting ordering patterns (optional step)', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const batchingOption = screen.getByText('Batching').closest('.ordering-card')
        
        // Select first
        fireEvent.click(batchingOption!)
        expect(batchingOption).toHaveClass('ordering-card-selected')
        
        // Deselect by clicking again
        fireEvent.click(batchingOption!)
        expect(batchingOption).not.toHaveClass('ordering-card-selected')
      })
    })
  })

  describe('Form State Preservation', () => {
    it('should preserve timing selection when switching ordering patterns', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        // Select timebox timing
        const timeboxOption = screen.getByText('Timeboxed').closest('.timing-card')
        fireEvent.click(timeboxOption!)
        
        // Select batching pattern
        const batchingOption = screen.getByText('Batching').closest('.ordering-card')
        fireEvent.click(batchingOption!)
        
        // Switch to alternating pattern
        const alternatingOption = screen.getByText('Alternating').closest('.ordering-card')
        fireEvent.click(alternatingOption!)
        
        // Timing should still be selected
        expect(timeboxOption).toHaveClass('timing-card-selected')
        expect(alternatingOption).toHaveClass('ordering-card-selected')
        expect(batchingOption).not.toHaveClass('ordering-card-selected')
      })
    })

    it('should preserve ordering pattern when switching timing', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        // Select batching pattern first
        const batchingOption = screen.getByText('Batching').closest('.ordering-card')
        fireEvent.click(batchingOption!)
        
        // Switch timing from untimebox to timebox
        const timeboxOption = screen.getByText('Timeboxed').closest('.timing-card')
        fireEvent.click(timeboxOption!)
        
        // Ordering pattern should still be selected
        expect(batchingOption).toHaveClass('ordering-card-selected')
        expect(timeboxOption).toHaveClass('timing-card-selected')
      })
    })
  })

  describe('All 8 Valid Combinations', () => {
    const combinations = [
      { timing: 'Timeboxed', pattern: null, description: 'Timebox only' },
      { timing: 'Timeboxed', pattern: 'Batching', description: 'Timebox + Batching' },
      { timing: 'Timeboxed', pattern: 'Alternating', description: 'Timebox + Alternating' },
      { timing: 'Timeboxed', pattern: '3-3-3', description: 'Timebox + 3-3-3' },
      { timing: 'Untimeboxed', pattern: null, description: 'Untimebox only' },
      { timing: 'Untimeboxed', pattern: 'Batching', description: 'Untimebox + Batching' },
      { timing: 'Untimeboxed', pattern: 'Alternating', description: 'Untimebox + Alternating' },
      { timing: 'Untimeboxed', pattern: '3-3-3', description: 'Untimebox + 3-3-3' }
    ]

    combinations.forEach(({ timing, pattern, description }) => {
      it(`should support combination: ${description}`, async () => {
        renderWithFormProvider(<InputsConfig />)
        
        await waitFor(() => {
          // Select timing
          const timingOption = screen.getByText(timing).closest('.timing-card')
          fireEvent.click(timingOption!)
          expect(timingOption).toHaveClass('timing-card-selected')
          
          // Select pattern if specified
          if (pattern) {
            const patternOption = screen.getByText(pattern).closest('.ordering-card')
            fireEvent.click(patternOption!)
            expect(patternOption).toHaveClass('ordering-card-selected')
          }
        })
      })
    })
  })

  describe('Visual Feedback and Purple Theme', () => {
    it('should apply purple theme to selected timing option', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const timeboxOption = screen.getByText('Timeboxed').closest('.timing-card')
        fireEvent.click(timeboxOption!)
        
        // Should have purple selection styling
        expect(timeboxOption).toHaveClass('timing-card-selected')
        
        // Check for purple-themed styling classes
        const iconContainer = timeboxOption?.querySelector('.p-2.rounded-lg')
        expect(iconContainer).toHaveClass('bg-primary-foreground/20')
      })
    })

    it('should apply purple theme to selected ordering pattern', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        const batchingOption = screen.getByText('Batching').closest('.ordering-card')
        fireEvent.click(batchingOption!)
        
        // Should have purple selection styling
        expect(batchingOption).toHaveClass('ordering-card-selected')
        
        // Check for purple-themed styling classes
        const iconContainer = batchingOption?.querySelector('.p-2.rounded-lg')
        expect(iconContainer).toHaveClass('bg-primary-foreground/20')
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should maintain mobile-responsive design', async () => {
      renderWithFormProvider(<InputsConfig />)
      
      await waitFor(() => {
        // Check for mobile responsive classes - look for grid container with responsive classes
        const gridContainer = screen.getByText('Step 1: Select timing approach (Required)').parentElement?.querySelector('.grid')
        expect(gridContainer).toBeInTheDocument()
        expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2')
      })
    })
  })
})