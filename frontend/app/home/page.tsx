'use client'
import Navigation from '@/components/parts/home/Navigation'
import Hero from '@/components/parts/home/Hero'

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
        <section id="pricing" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
          <div className="text-center space-y-6 p-8">
            <h2 className="text-4xl font-bold">Pricing Section</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              This is the pricing section that the navigation should scroll to when you click the "Pricing" link.
            </p>
            <div className="mt-8 p-6 border rounded-lg bg-card">
              <h3 className="text-2xl font-semibold mb-4">Test Plan</h3>
              <p className="text-muted-foreground">
                Click the "Try YourMum" button to test the handleGetStarted functionality.
              </p>
            </div>
          </div>
        </section>

        {/* Footer spacer */}
        <section className="min-h-screen flex items-center justify-center bg-muted/5">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-4">End of Test Page</h2>
            <p className="text-muted-foreground">Navigation testing complete!</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default TestHomePage