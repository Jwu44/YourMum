import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { type WithHandleGetStarted } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

const Navigation = ({ handleGetStarted }: WithHandleGetStarted) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`fixed top-7 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 rounded-full ${
        isScrolled 
          ? "h-[60px] bg-background/40 backdrop-blur-xl border border-white/10 scale-95 w-[30%] max-w-1xl shadow-lg" 
          : "h-[60px] bg-background/40 backdrop-blur-xl w-[40%] max-w-3xl border border-border/50 shadow-md"
      }`}
    >
      <div className="mx-auto h-full px-6">
        <nav className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <Link href="/" className="focus:outline-none flex items-center gap-2">
              <Image
                src="/favicon-96x96.png"
                alt="YourMum logo"
                width={24}
                height={24}
                className="w-6 h-6 hover:opacity-80 transition-opacity"
                priority
                quality={100}
                style={{ imageRendering: 'crisp-edges' }}
              />
              <span className="font-bold text-primary-blue">YourMum</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('features')
              }}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('pricing')
              }}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              Pricing
            </a>
            <Button 
              onClick={handleGetStarted}
              size="default"
              className="button-gradient rounded-full"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="glass">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-background/95 backdrop-blur-sm">
                <div className="flex flex-col gap-4 mt-8">
                  <a
                    href="#pricing"
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      setIsMobileMenuOpen(false)
                      scrollToSection('pricing')
                    }}
                  >
                    Pricing
                  </a>
                  <Button 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleGetStarted()
                    }}
                    className="button-gradient rounded-full mt-4"
                  >
                    Get Started
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Navigation