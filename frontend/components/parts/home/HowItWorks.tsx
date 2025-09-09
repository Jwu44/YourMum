import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type WithHandleGetStarted } from '@/lib/types'

const HowItWorks = ({ handleGetStarted }: WithHandleGetStarted) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const steps = [
    {
      id: 1,
      title: 'Add your tasks',
      description: 'Quickly input all your unscheduled tasks and to-dos for the day in one simple interface.',
      hasVideo: true,
      videoSrc: '/demos/Demo 1.mov'
    },
    {
      id: 2,
      title: 'Set preferences',
      description: 'Tell us about your lifestyle, working hours, and energy patterns for personalized scheduling.',
      hasVideo: true,
      videoSrc: '/demos/Demo 2.mov'
    },
    {
      id: 3,
      title: 'Connect apps',
      description: 'Sync with Google Calendar and Slack to automatically import meetings and create smart tasks.',
      hasVideo: true,
      videoSrc: '/demos/Demo 3.mov'
    }
  ]

  return (
    <section className="py-20 bg-gradient-section" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-20">
          <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            How it works
          </h1>
          <h2 className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started with YourMum in three simple steps
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative">
              {/* Enhanced Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-1 z-10">
                  <div className="relative w-full h-full bg-gradient-to-r from-border via-primary/30 to-border rounded-full">
                    <div className={`absolute inset-0 bg-gradient-primary rounded-full transition-all duration-1000 ${
                      hoveredCard === step.id || hoveredCard === step.id + 1
                        ? 'w-full opacity-100' 
                        : 'w-0 opacity-0'
                    }`} />
                    {/* Animated dot */}
                    <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full transition-all duration-1000 ${
                      hoveredCard === step.id || hoveredCard === step.id + 1
                        ? 'left-full -translate-x-3 opacity-100 animate-pulse' 
                        : 'left-0 opacity-0'
                    }`} />
                  </div>
                </div>
              )}
              
              <div
                className="bg-card rounded-3xl shadow-elegant border border-border w-full max-w-sm hover:shadow-glow transition-all duration-500 animate-slide-up overflow-hidden group"
                style={{ animationDelay: `${index * 0.15}s` }}
                onMouseEnter={() => setHoveredCard(step.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Video/Image Section */}
                {step.hasVideo ? (
                  <div className="relative bg-gradient-to-br from-accent/50 to-accent overflow-hidden" style={{ aspectRatio: '16/10' }}>
                    <video
                      src={step.videoSrc}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                  <div className="w-full bg-gradient-to-br from-accent/50 to-accent flex items-center justify-center" style={{ aspectRatio: '16/10' }}>
                    <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center">
                      <div className="w-10 h-10 bg-primary/40 rounded-xl" />
                    </div>
                  </div>
                )}
                
                {/* Content Section */}
                <div className="px-8 py-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-gradient-primary text-primary-foreground w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg border-2 border-white/20 flex-shrink-0">
                      {step.id}
                    </div>
                    <h3 className="text-2xl font-bold text-card-foreground capitalize">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-base">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
