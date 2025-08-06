import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { type WithHandleGetStarted } from '@/lib/types'
import Image from 'next/image'

const Hero = ({ handleGetStarted }: WithHandleGetStarted) => {
  return (
    <section className="relative bg-gradient-hero min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left animate-fade-in">
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <Image
              src="/favicon-96x96.png"
              alt="yourdai logo"
              width={152}
              height={40}
              className="h-10 w-auto"
              priority
              quality={100}
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>

          <h2 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Your AI-Powered
            <span className="text-primary block bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Daily Planner</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Transform your productivity with intelligent task management.
            Let AI help you prioritize, schedule, and accomplish more every day.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
            <Button variant="premium" size="lg" className="px-8 py-4 text-lg" onClick={handleGetStarted}>
              Start yourdai
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-primary mr-2" />
              Free to start
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-primary mr-2" />
              No credit card
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-primary mr-2" />
              AI-powered
            </div>
          </div>
        </div>

        <div className="relative animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="bg-card rounded-2xl shadow-elegant border border-border p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <span className="font-semibold text-card-foreground">Tuesday, July 15</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center mb-3">
                  <span className="text-lg">🌅</span>
                  <h3 className="font-semibold text-card-foreground ml-2">Morning</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-border rounded-sm mr-3"></div>
                      <span className="text-card-foreground">gym</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-border rounded-sm mr-3"></div>
                      <span className="text-card-foreground">check slack</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-border rounded-sm mr-3"></div>
                      <span className="text-card-foreground">write prd</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center mb-3">
                  <span className="text-lg">☀️</span>
                  <h3 className="font-semibold text-card-foreground ml-2">Afternoon</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-border rounded-sm mr-3"></div>
                      <span className="text-card-foreground">wil 1:1 meeting</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-border rounded-sm mr-3"></div>
                      <span className="text-card-foreground">design jam with designers</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center mb-3">
                  <span className="text-lg">🌙</span>
                  <h3 className="font-semibold text-card-foreground ml-2">Evening</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-border rounded-sm mr-3"></div>
                      <span className="text-card-foreground">dinner with Asta</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 right-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
                <span className="text-primary-foreground text-xl">+</span>
              </div>
            </div>
          </div>

          <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/20 rounded-full opacity-50"></div>
          <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-accent/30 rounded-full opacity-30"></div>
        </div>
      </div>
    </section>
  )
}

export default Hero
