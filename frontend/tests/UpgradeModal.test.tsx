/**
 * Test suite for UpgradeModal component.
 * Tests modal display, upgrade actions, and user interaction scenarios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpgradeModal } from '@/components/parts/UpgradeModal'

// Mock billing API
vi.mock('@/lib/api/billing', () => ({
  initiateProCheckout: vi.fn()
}))

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('UpgradeModal', () => {
  const mockOnClose = vi.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    creditsNeeded: 1,
    operationType: 'schedule_generation' as const
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<UpgradeModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
      expect(screen.getByText(/insufficient credits/i)).toBeInTheDocument()
    })

    it('should not render modal when closed', () => {
      render(<UpgradeModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display correct credits needed', () => {
      render(<UpgradeModal {...defaultProps} creditsNeeded={3} />)

      expect(screen.getByText(/3 credits/i)).toBeInTheDocument()
    })

    it('should display operation type context', () => {
      render(<UpgradeModal {...defaultProps} operationType="task_breakdown" />)

      expect(screen.getByText(/task breakdown/i)).toBeInTheDocument()
    })
  })

  describe('Plan Options', () => {
    it('should display monthly and annual plan options', () => {
      render(<UpgradeModal {...defaultProps} />)

      expect(screen.getByText('$7/month')).toBeInTheDocument()
      expect(screen.getByText('$64/year')).toBeInTheDocument()
      expect(screen.getByText(/save \$20/i)).toBeInTheDocument()
    })

    it('should allow toggling between monthly and annual billing', () => {
      render(<UpgradeModal {...defaultProps} />)

      const annualButton = screen.getByText('Annual')
      fireEvent.click(annualButton)

      // Annual should be selected
      expect(screen.getByText('Choose Annual Pro')).toBeInTheDocument()
    })

    it('should show plan features', () => {
      render(<UpgradeModal {...defaultProps} />)

      expect(screen.getByText('40 AI credits monthly')).toBeInTheDocument()
      expect(screen.getByText('Slack integration')).toBeInTheDocument()
      expect(screen.getByText('Priority support')).toBeInTheDocument()
    })
  })

  describe('User Actions', () => {
    it('should call onClose when close button clicked', () => {
      render(<UpgradeModal {...defaultProps} />)

      const closeButton = screen.getByLabelText(/close/i)
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when cancel button clicked', () => {
      render(<UpgradeModal {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should close modal when clicking outside', () => {
      render(<UpgradeModal {...defaultProps} />)

      const overlay = screen.getByRole('dialog').parentElement
      if (overlay) {
        fireEvent.click(overlay)
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Upgrade Flow', () => {
    it('should initiate monthly checkout when monthly upgrade clicked', async () => {
      const { initiateProCheckout } = await import('@/lib/api/billing')
      vi.mocked(initiateProCheckout).mockResolvedValue({
        success: true,
        checkoutUrl: 'https://checkout.stripe.com/test'
      })

      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      })

      render(<UpgradeModal {...defaultProps} />)

      const upgradeButton = screen.getByText('Choose Monthly Pro')
      fireEvent.click(upgradeButton)

      await waitFor(() => {
        expect(initiateProCheckout).toHaveBeenCalledWith('month')
      })
    })

    it('should initiate annual checkout when annual upgrade clicked', async () => {
      const { initiateProCheckout } = await import('@/lib/api/billing')
      vi.mocked(initiateProCheckout).mockResolvedValue({
        success: true,
        checkoutUrl: 'https://checkout.stripe.com/test'
      })

      render(<UpgradeModal {...defaultProps} />)

      // Switch to annual
      const annualButton = screen.getByText('Annual')
      fireEvent.click(annualButton)

      const upgradeButton = screen.getByText('Choose Annual Pro')
      fireEvent.click(upgradeButton)

      await waitFor(() => {
        expect(initiateProCheckout).toHaveBeenCalledWith('year')
      })
    })

    it('should handle upgrade failure gracefully', async () => {
      const { initiateProCheckout } = await import('@/lib/api/billing')
      const { useToast } = await import('@/hooks/use-toast')
      const mockToast = vi.fn()
      vi.mocked(useToast).mockReturnValue({ toast: mockToast })

      vi.mocked(initiateProCheckout).mockResolvedValue({
        success: false,
        error: 'Payment processing error'
      })

      render(<UpgradeModal {...defaultProps} />)

      const upgradeButton = screen.getByText('Choose Monthly Pro')
      fireEvent.click(upgradeButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Error',
          description: 'Payment processing error'
        })
      })
    })

    it('should show loading state during upgrade process', async () => {
      const { initiateProCheckout } = await import('@/lib/api/billing')

      // Create a promise that we can control
      let resolveCheckout: (value: any) => void
      const checkoutPromise = new Promise((resolve) => {
        resolveCheckout = resolve
      })
      vi.mocked(initiateProCheckout).mockReturnValue(checkoutPromise)

      render(<UpgradeModal {...defaultProps} />)

      const upgradeButton = screen.getByText('Choose Monthly Pro')
      fireEvent.click(upgradeButton)

      // Should show loading state
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

      // Resolve the promise
      resolveCheckout({ success: true, checkoutUrl: 'test' })

      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<UpgradeModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should trap focus within modal', () => {
      render(<UpgradeModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('should close modal on Escape key', () => {
      render(<UpgradeModal {...defaultProps} />)

      fireEvent.keyDown(screen.getByRole('dialog'), {
        key: 'Escape',
        code: 'Escape'
      })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })
})