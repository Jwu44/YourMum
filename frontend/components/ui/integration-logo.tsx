/**
 * @file integration-logo.tsx
 * @description Reusable logo component for integration cards with consistent 32x32 sizing
 */

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface IntegrationLogoProps {
  src: string
  alt: string
  className?: string
}

export const IntegrationLogo: React.FC<IntegrationLogoProps> = ({ 
  src, 
  alt, 
  className 
}) => (
  <Image
    src={src}
    alt={alt}
    width={32}
    height={32}
    className={cn("w-8 h-8", className)}
    priority
  />
)