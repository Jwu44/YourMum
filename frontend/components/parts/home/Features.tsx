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
        title: 'Create a schedule that works for you',
        description: 'YourMum captures inputs about your lifestyle to design a feasible schedule for you.',
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
        description: 'YourMum automatically categorises your tasks for prioritisation after you provide your lifestyle.',
        image: '/images/features/Auto categorise.png'
      },
      {
        id: 'a2',
        title: 'Create your next day in 1 click',
        description: 'YourMum rolls over incomplete, recurring, and calendar tasks into your next day automatically.',
        image: '/images/features/Create next day demo.mov',
        hasVideo: true,
        videoSrc: '/images/features/Create next day demo.mov'
      },
      {
        id: 'a3',
        title: 'Task decomposition',
        description: 'Break down complex tasks into smaller, actionable steps with ease.',
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
        description: 'Connect third-party apps to auto-create tasks. Soon, YourMum will also handle simple admin tasks for you.',
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
    <section className="py-24 px-4 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">Features</h1>
      </div>

      {/* Horizontal Toggle Group */}
      <div className="mb-12 py-4" ref={toggleRef}>
        <div
          className="flex justify-center"
          role="tablist"
          aria-label="Feature categories"
        >
          <div className="bg-feature-toggle-bg rounded-[var(--feature-radius)] p-2 flex gap-1">
            {featureGroups.map((group, index) => (
              <button
                key={group.id}
                role="tab"
                aria-selected={activeGroup === group.id}
                aria-controls={`panel-${group.id}`}
                className={`
                  px-6 py-3 rounded-[calc(var(--feature-radius)-0.5rem)] font-medium transition-all duration-200
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      <div className="p-12 flex flex-col justify-center">
                        <h2 className="text-3xl font-bold mb-6 leading-tight" style={{ color: '#373667' }}>
                          {card.title}
                        </h2>
                        {card.description && (
                          <p className="text-lg leading-relaxed" style={{ color: '#373667' }}>
                            {card.description}
                          </p>
                        )}
                      </div>
                      <div className="relative overflow-hidden">
                        <div
                          className={`w-full h-80 lg:h-full bg-white flex items-center justify-center ${
                            card.hasVideo ? '' : 'p-2.5'
                          }`}
                          style={{ aspectRatio: '16/10' }}
                        >
                          {card.hasVideo ? (
                            <video
                              src={card.videoSrc}
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
                              aria-label={`Demo video for ${card.title}`}
                            />
                          ) : (
                            <img
                              src={card.image}
                              alt={`Feature illustration for ${card.title}`}
                              className="w-full h-full object-cover"
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
