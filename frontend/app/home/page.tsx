'use client'
import Navigation from '@/components/parts/home/Navigation'
import Hero from '@/components/parts/home/Hero'
import Features from '@/components/parts/home/Features'
import HowItWorks from '@/components/parts/home/HowItWorks'
import PricingSection from '@/components/parts/home/Pricing'
import Footer from '@/components/parts/home/Footer'

const TestHomePage = () => {
  const handleGetStarted = async () => {
    console.log('Get started clicked!')
    alert('Get started functionality works!')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation handleGetStarted={handleGetStarted} />
      
      {/* Content sections for testing scroll functionality */}
      <main>
        {/* Hero Section with 3D Dashboard */}
        <Hero handleGetStarted={handleGetStarted} />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />

        {/* Spacer sections to test scroll behavior */}
        <section className="min-h-screen flex items-center justify-center bg-muted/10">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-4">Scroll Test Section 1</h2>
            <p className="text-muted-foreground">Keep scrolling to see the navigation transform...</p>
          </div>
        </section>

        <section className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-4">Scroll Test Section 2</h2>
            <p className="text-muted-foreground">Notice how the navigation becomes more compact and translucent.</p>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection handleGetStarted={handleGetStarted} />

      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default TestHomePage