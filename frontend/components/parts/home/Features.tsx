import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface FeatureCard {
  id: string
  title: string
  description?: string
  image: string
  hasVideo?: boolean
  videoSrc?: string
}

interface FeatureGroup {
  id: 'personalisation' | 'automation' | 'streamlined'
  label: string
  cards: FeatureCard[]
}

const featureGroups: FeatureGroup[] = [
  {
    id: 'personalisation',
    label: 'Personalisation',
    cards: [
      {
        id: 'p1',
        title: 'Adapts to your changing lifestyle',
        description: 'YourMum learns your energy levels, priorities, and habits overtime — then builds a schedule that fits you.',
        image: '/images/features/Personalisation.png'
      }
    ]
  },
  {
    id: 'automation',
    label: 'Automation',
    cards: [
      {
        id: 'a1',
        title: 'Auto-categorise tasks',
        description: 'YourMum categorises tasks for prioritisation after providing details about your lifestyle.',
        image: '/images/features/Auto categorise.png'
      },
      {
        id: 'a2',
        title: 'Create your next day in 1 click',
        description: 'YourMum rolls over incomplete, recurring and calendar tasks into your next day.',
        image: '/images/features/Create next day demo.mov',
        hasVideo: true,
        videoSrc: '/images/features/Create next day demo.mov'
      },
      {
        id: 'a3',
        title: 'Turn big tasks into mini steps',
        description: 'Break down complex tasks into clear, smaller and actionable steps. Then you can choose which to keep.',
        image: '/images/features/Decompose.mov',
        hasVideo: true,
        videoSrc: '/images/features/Decompose.mov'
      }
    ]
  },
  {
    id: 'streamlined',
    label: 'Streamlined',
    cards: [
      {
        id: 's1',
        title: 'Integrations',
        description: 'Connect third-party apps to auto-create tasks. YourMum will act as an agent to action simple admin tasks (Coming Soon)',
        image: '/images/features/Integration demo.mov',
        hasVideo: true,
        videoSrc: '/images/features/Integration demo.mov'
      }
    ]
  }
]

const Features = (): JSX.Element => {
  const [activeGroup, setActiveGroup] = useState<'personalisation' | 'automation' | 'streamlined'>('personalisation')
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)
  const toggleRef = useRef<HTMLDivElement>(null)
  const preloadedVideosRef = useRef<HTMLVideoElement[]>([])

  // Handle keyboard navigation for toggles
  const handleKeyDown = useCallback((event: KeyboardEvent, currentIndex: number) => {
    const groups = featureGroups.map(g => g.id)
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : groups.length - 1
        break
      case 'ArrowRight':
        event.preventDefault()
        newIndex = currentIndex < groups.length - 1 ? currentIndex + 1 : 0
        break
      default:
        return
    }

    setActiveGroup(groups[newIndex])
    // Focus the new tab
    const newTab = toggleRef.current?.children[newIndex] as HTMLButtonElement
    newTab?.focus()
  }, [])

  // Set up intersection observer for cards
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setVisibleCards(new Set(featureGroups.flatMap(group => group.cards.map(card => card.id))))
      return
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute('data-card-id')
            if (cardId) {
              setVisibleCards(prev => new Set([...Array.from(prev), cardId]))
            }
          }
        })
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px'
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Preload demo videos so they can autoplay without lag
  useEffect(() => {
    const videoSources = featureGroups
      .flatMap(group => group.cards)
      .filter(card => card.hasVideo && card.videoSrc)
      .map(card => card.videoSrc as string)

    preloadedVideosRef.current = videoSources.map((src) => {
      const video = document.createElement('video')
      video.src = src
      video.preload = 'auto'
      video.muted = true
      // playsInline is not always reflected via property on some browsers
      video.setAttribute('playsinline', '')
      try {
        // Attempt a silent play to warm up decoding pipeline
        // Some browsers will ignore this off-DOM, but it's safe
        // and helps when allowed.
        // We intentionally don't await.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        video.play()
      } catch {
        // Ignore autoplay restrictions during preload
      }
      // Ensure buffering starts
      video.load()
      return video
    })

    return () => {
      preloadedVideosRef.current.forEach(v => {
        v.pause()
        v.removeAttribute('src')
        v.load()
      })
      preloadedVideosRef.current = []
    }
  }, [])

  // Observe cards when active group changes
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()

      const currentGroup = featureGroups.find(g => g.id === activeGroup)
      if (currentGroup) {
        currentGroup.cards.forEach(card => {
          const element = cardsRef.current[card.id]
          if (element && observerRef.current) {
            observerRef.current.observe(element)
          }
        })
      }
    }
  }, [activeGroup])

  const handleGroupChange = (groupId: 'personalisation' | 'automation' | 'streamlined') => {
    setActiveGroup(groupId)
    setVisibleCards(new Set())
  }

  const activeGroupData = featureGroups.find(g => g.id === activeGroup)

  return (
    <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">Features</h1>
      </div>

      {/* Horizontal Toggle Group */}
      <div className="mb-5 py-5" ref={toggleRef}>
        <div
          className="flex justify-center px-4 sm:px-6 lg:px-8"
          role="tablist"
          aria-label="Feature categories"
        >
          <div className="bg-feature-toggle-bg rounded-[var(--feature-radius)] p-2 flex gap-1 w-full max-w-md sm:max-w-lg md:max-w-none md:w-auto">
            {featureGroups.map((group, index) => (
              <button
                key={group.id}
                role="tab"
                aria-selected={activeGroup === group.id}
                aria-controls={`panel-${group.id}`}
                className={`
                  flex-1 md:flex-initial px-2 sm:px-3 md:px-6 py-2 md:py-3 rounded-[calc(var(--feature-radius)-0.5rem)] font-medium transition-all duration-200 text-xs sm:text-sm md:text-base
                  ${activeGroup === group.id
                    ? 'bg-feature-toggle-active text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                  }
                `}
                onClick={() => { handleGroupChange(group.id) }}
                onKeyDown={(e) => { handleKeyDown(e.nativeEvent, index) }}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div ref={contentRef} className="min-h-[600px]">
        {activeGroupData && (
          <div
            id={`panel-${activeGroup}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeGroup}`}
            className="feature-group-transition feature-group-enter"
          >
            <div className="space-y-8">
              {activeGroupData.cards.map((card, index) => (
                <Card
                  key={card.id}
                  ref={(el) => { cardsRef.current[card.id] = el }}
                  data-card-id={card.id}
                  className={`
                    bg-feature-bg-pastel border-0 overflow-hidden w-full scroll-mt-8
                    ${visibleCards.has(card.id) ? 'feature-card-enter' : 'opacity-0'}
                  `}
                  style={{
                    borderRadius: 'var(--feature-radius)',
                    boxShadow: 'var(--feature-shadow)',
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0">
                      <div className="p-6 md:p-12 flex flex-col justify-center order-2 lg:order-1">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 leading-tight" style={{ color: '#373667' }}>
                          {card.title}
                        </h2>
                        {card.description && (
                          <p className="text-base md:text-lg leading-relaxed" style={{ color: '#373667' }}>
                            {card.description}
                          </p>
                        )}
                      </div>
                      <div className="relative order-1 lg:order-2 lg:overflow-hidden">
                        <div
                          className={`w-full bg-white flex items-center justify-center ${
                            card.hasVideo ? 'lg:h-full' : 'p-2.5 lg:h-full'
                          }`}
                          style={{
                            minHeight: '240px',
                            aspectRatio: card.hasVideo ? undefined : '16/10'
                          }}
                        >
                          {card.hasVideo ? (
                            <video
                              src={card.videoSrc}
                              preload="auto"
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="w-full h-full lg:object-cover object-contain"
                              style={{
                                minHeight: '240px',
                                maxHeight: '400px'
                              }}
                              onMouseEnter={(e) => {
                                const video = e.target as HTMLVideoElement
                                video.play().catch(console.error)
                              }}
                              onMouseLeave={(e) => {
                                const video = e.target as HTMLVideoElement
                                video.pause()
                                video.currentTime = 0
                              }}
                              onCanPlay={(e) => {
                                const video = e.target as HTMLVideoElement
                                if (video.paused) {
                                  video.play().catch(() => {})
                                }
                              }}
                              aria-label={`Demo video for ${card.title}`}
                            />
                          ) : (
                            <img
                              src={card.image}
                              alt={`Feature illustration for ${card.title}`}
                              className="w-full h-auto lg:h-full lg:object-cover object-contain"
                              style={{
                                minHeight: '200px',
                                maxHeight: '400px'
                              }}
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="text-muted-foreground text-center p-8">
                                      <div class="text-sm font-mono">PLACEHOLDER_${card.id.toUpperCase()}</div>
                                    </div>
                                  `
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Features
