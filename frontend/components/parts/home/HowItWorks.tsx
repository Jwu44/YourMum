import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type WithHandleGetStarted } from '@/lib/types'

const HowItWorks = ({ handleGetStarted }: WithHandleGetStarted) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const steps = [
    {
      id: 1,
      title: 'Create task',
      description: 'Add unsynced tasks you have for your current day.',
      hasVideo: true,
      videoSrc: '/demos/Demo 1.mov'
    },
    {
      id: 2,
      title: 'Fill out preferences',
      description: 'Provide details about your lifestyle so YourMum can create a personalised schedule.',
      hasVideo: true,
      videoSrc: '/demos/Demo 2.mov'
    },
    {
      id: 3,
      title: 'Link apps',
      description: 'Integrate YourMum with Google Calendar, Slack and more (coming soon) to automatically create tasks.',
      hasVideo: true,
      videoSrc: '/demos/Demo 3.mov'
    }
  ]

  return (
    <section className="py-20 bg-gradient-section" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            How it works
          </h1>
          <h2 className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started with YourMum in three steps
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center space-y-8 lg:space-y-0 lg:space-x-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col lg:flex-row items-center">
              <div
                className="bg-card rounded-2xl p-8 shadow-elegant border border-border max-w-sm text-center hover:shadow-glow transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
                onMouseEnter={() => setHoveredCard(step.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {step.hasVideo ? (
                  <div className="relative mb-6 bg-accent rounded-2xl overflow-hidden aspect-video">
                    <video
                      src={step.videoSrc}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                      onMouseEnter={(e) => {
                        const video = e.target as HTMLVideoElement
                        video.play().catch(console.error)
                      }}
                      onMouseLeave={(e) => {
                        const video = e.target as HTMLVideoElement
                        video.pause()
                        video.currentTime = 0
                      }}
                      aria-label={`Demo video for ${step.title}`}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg" />
                  </div>
                )}
                
                <div className="bg-gradient-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold shadow-glow">
                  {step.id}
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {index < steps.length - 1 && (
                <ArrowRight className="w-8 h-8 text-primary/30 mt-8 lg:mt-0 lg:mx-4 transform rotate-90 lg:rotate-0" />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button 
            onClick={handleGetStarted}
            className="button-gradient px-8 py-3 text-lg"
          >
            Try YourMum
          </Button>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
