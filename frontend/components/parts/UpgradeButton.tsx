/**
 * Reusable Upgrade to Pro button component
 * Can be used across different pages and contexts
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Crown } from 'lucide-react'
import { UpgradeModal } from '@/components/parts/UpgradeModal'

interface UpgradeButtonProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showIcon?: boolean
  children?: React.ReactNode
}

export function UpgradeButton({
  className = '',
  size = 'default',
  variant = 'default',
  showIcon = true,
  children = 'Upgrade to Pro'
}: UpgradeButtonProps): JSX.Element {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const buttonClass = variant === 'default'
    ? `bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-medium ${className}`
    : className

  return (
    <>
      <Button
        className={buttonClass}
        size={size}
        variant={variant}
        onClick={() => setShowUpgradeModal(true)}
        data-testid="upgrade-button"
      >
        {showIcon && <Crown className="w-4 h-4 mr-2" />}
        {children}
      </Button>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        creditsNeeded={1}
        operationType="schedule_generation"
      />
    </>
  )
}