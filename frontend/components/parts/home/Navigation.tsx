import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { type WithHandleGetStarted } from '@/lib/types'
import Image from 'next/image'

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
      className={`fixed top-3.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 rounded-full ${
        isScrolled 
          ? "h-14 bg-background/40 backdrop-blur-xl border border-white/10 scale-95 w-[90%] max-w-2xl shadow-lg" 
          : "h-14 bg-background/40 backdrop-blur-xl w-[95%] max-w-3xl border border-border/50 shadow-md"
      }`}
    >
      <div className="mx-auto h-full px-6">
        <nav className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <button onClick={handleGetStarted} className="focus:outline-none flex items-center gap-2">
              <Image
                src="/favicon-96x96.png"
                alt="YourMum logo"
                width={20}
                height={20}
                className="w-5 h-5 hover:opacity-80 transition-opacity"
                priority
                quality={100}
                style={{ imageRendering: 'crisp-edges' }}
              />
              <span className="font-bold text-primary-blue">YourMum</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('pricing')
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              Pricing
            </a>
            <Button 
              onClick={handleGetStarted}
              size="sm"
              className="button-gradient"
            >
              Try YourMum
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="glass">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-background/95 backdrop-blur-sm">
                <div className="flex flex-col gap-4 mt-8">
                  <a
                    href="#pricing"
                    className="text-lg text-muted-foreground hover:text-foreground transition-colors"
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
                    className="button-gradient mt-4"
                  >
                    Try YourMum
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