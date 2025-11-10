'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Star, Loader2 } from 'lucide-react'
import { billingApi } from '@/lib/api/billing'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: 'free' | 'pro'
  onPlanChanged?: () => void
}

export const PricingModal = ({
  open,
  onOpenChange,
  currentPlan,
  onPlanChanged
}: PricingModalProps) => {
  const { toast } = useToast()
  const [isDowngrading, setIsDowngrading] = useState(false)

  const handleUpgradeToPro = () => {
    // Redirect to Stripe checkout
    window.location.href = 'https://buy.stripe.com/6oU3cvb8IcF2bxCcd22cg00'
  }

  const handleDowngradeToFree = async () => {
    setIsDowngrading(true)
    try {
      const result = await billingApi.cancelSubscription({ cancelImmediately: false })

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel subscription')
      }

      toast({
        title: 'Subscription cancelled',
        description: 'Your subscription will be cancelled at the end of the billing period. You will still have access to Pro features until then.',
        variant: 'success'
      })

      // Close modal and notify parent
      onOpenChange(false)
      onPlanChanged?.()
    } catch (error) {
      console.error('Error downgrading to free:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel subscription. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsDowngrading(false)
    }
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      credits: '5 credits total',
      features: [
        '5 credits total',
        'Limited schedule personalisation',
        'Limited task breakdowns',
        'Sync with Gcal and Slack'
      ],
      planType: 'free' as const
    },
    {
      name: 'Pro',
      price: '$7',
      period: 'month',
      credits: '40 credits/month',
      features: [
        '40 credits monthly',
        'More schedule personalisation',
        'More task breakdowns',
        'Access to upcoming integrations',
        'Priority support'
      ],
      planType: 'pro' as const
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">
            Manage Your Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Choose the plan that works best for you
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.planType === currentPlan
            const isPro = plan.planType === 'pro'

            return (
              <div
                key={plan.planType}
                className={cn(
                  'relative bg-card rounded-2xl p-6 sm:p-8 border transition-all duration-300 flex flex-col',
                  isPro && !isCurrentPlan
                    ? 'border-primary shadow-glow scale-105'
                    : 'border-border'
                )}
              >
                {isPro && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          'text-3xl sm:text-4xl font-bold',
                          isCurrentPlan
                            ? 'text-muted-foreground'
                            : 'text-card-foreground'
                        )}
                      >
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {plan.credits}
                  </p>
                </div>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-card-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : isPro ? (
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 shadow-glow text-primary-foreground"
                    size="lg"
                    onClick={handleUpgradeToPro}
                  >
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={handleDowngradeToFree}
                    disabled={isDowngrading}
                  >
                    {isDowngrading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downgrading...
                      </>
                    ) : (
                      'Downgrade to Free'
                    )}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
