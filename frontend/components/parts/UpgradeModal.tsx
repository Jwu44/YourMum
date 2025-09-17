/**
 * UpgradeModal component for handling credit exhaustion scenarios.
 * Displays when users need to upgrade to Pro to continue using features.
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Loader2, X } from 'lucide-react'

import { useToast } from '@/hooks/use-toast'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  creditsNeeded: number
  operationType?: 'schedule_generation' | 'task_breakdown'
}

export function UpgradeModal({
  isOpen,
  onClose,
  creditsNeeded,
  operationType
}: UpgradeModalProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()


  /**
   * Handle Pro plan upgrade via direct Stripe payment link
   */
  const handleUpgrade = () => {
    setIsLoading(true)
    // Direct redirect to Stripe payment link
    window.location.href = 'https://buy.stripe.com/6oU3cvb8IcF2bxCcd22cg00'
  }

  const proFeatures = [
    '40 AI credits monthly',
    'Everything in Free',
    'Slack integration',
    'Priority support',
    'Advanced scheduling'
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="upgrade-modal-title"
        aria-modal="true"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle id="upgrade-modal-title" className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Upgrade to Pro
            </DialogTitle>
          </div>
          <DialogDescription>
            You need {creditsNeeded} credit{creditsNeeded !== 1 ? 's' : ''} to continue,
            but you have insufficient credits remaining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">

          {/* Pro Plan Card */}
          <div className="border border-primary rounded-lg p-4 bg-primary/5">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold">Pro Plan</h3>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold">$7</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium">40 credits/month</p>
            </div>

            <ul className="space-y-2 mb-4">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-medium"
              size="lg"
              disabled={isLoading}
              onClick={handleUpgrade}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" data-testid="loading-spinner" />
                  Redirecting...
                </>
              ) : (
                'Choose Monthly Pro'
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}