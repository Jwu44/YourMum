import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { type WithHandleGetStarted } from '@/lib/types'
import Image from 'next/image'

const Navigation = ({ handleGetStarted }: WithHandleGetStarted) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full bg-background/40 backdrop-blur-xl border-b border-border/50 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/yourdai_logo.png"
              alt="yourdai logo"
              width={124}
              height={32}
              className="h-8 w-auto"
              priority
              quality={100}
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </div>

            <div className="flex items-center space-x-3">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow" onClick={handleGetStarted}>
                Get started
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsMenuOpen(!isMenuOpen) }}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border animate-fade-in">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#features" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#solutions" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Solutions
              </a>
              <a href="#pricing" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#about" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <div className="pt-4 space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleGetStarted}>
                  Sign In
                </Button>
                <Button size="sm" className="w-full bg-gradient-primary hover:opacity-90" onClick={handleGetStarted}>
                  Start Free Trial
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
