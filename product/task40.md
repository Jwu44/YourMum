# Task: Reskin Features.tsx 
# Status: To do

# Requirements:
1) Section header

<h1>: Features

2) Top controls (replaces two-column layout)

Horizontal toggle group (centered, sticky at top of section on scroll):

Personalisation | Automation | Streamlined

Default state: Personalisation is selected on first load.

A11y: role=tablist, each toggle role=tab, selected tab has aria-selected="true". Keyboard: left/right arrows change tabs.

3) Content area behavior

The content below the toggles fills full width of the section.

Only one feature group is visible at a time (based on selected toggle).

Transitions: 200–300ms fade/translateY; respect prefers-reduced-motion.

4) Card styling (all groups)

Full-width cards with generous padding, rounded corners (lg/2xl), soft shadow, subtle pastel background.

Consistent structure per card:

<h2> (headline)

<p> (1–2 lines body) — omit when not provided

image (placeholder if asset unavailable)

Mobile: stack content; desktop: card max-width ~960–1100px centered.

5) Groups & cards
A) Personalisation (default)

Card P1

h2: Create a schedule that works for you

Body: YourMum captures inputs about your lifestyle to design a feasible schedule for you.

Image: PLACEHOLDER_LAYOUT (reference “Layout” UI)

B) Automation

Layout rule: When this tab is active, cards are vertically stacked (one under another) like the Willow example. Each card reveals as it enters the viewport (IO fade/slide). Optional scroll-snap to give a “section step” feel.

Card A1

h2: Auto-categorise tasks

Body: YourMum automatically categorises your tasks for prioritisation after you provide your lifestyle.

Image: PLACEHOLDER_EDIT_TASK (reference “Edit Task” UI)

Card A2

h2: Create your next day in 1 click

Body: YourMum rolls over incomplete, recurring, and calendar tasks into your next day automatically.

Image: PLACEHOLDER_VIEW_NEXT_DAY (reference “View next day” UI)

Card A3

h2: Task decomposition

Body: Break down complex tasks into smaller, actionable steps with ease.

Image: PLACEHOLDER_DECISION_LOG (reference “Create decision log…” UI)

C) Streamlined

Card S1

h2: Integrations

Body: Connect third-party apps to auto-create tasks. Soon, YourMum will also handle simple admin tasks for you.

Image: PLACEHOLDER_INTEGRATIONS (generic integrations visual)

6) Interactions & state

Clicking a toggle switches the visible group; scroll position resets to the top of that group.

Automation group uses stacked vertical sections; other groups show single full-width card.

Add a persistent “Back to top” affordance within Automation after Card A1 enters view.

7) Performance & assets

Lazy-load images; use aspect-ratio boxes to prevent layout shift.

If any image reference is missing or invalid, render the placeholder token text inside a neutral image frame.

8) Visual system tokens (suggested)

Radius: 1.25rem

Shadow: 0 10px 30px rgba(0,0,0,0.08)

Spacing: section py-24, card p-8–12

Animation: opacity 250ms ease, transform 250ms ease (translateY 8–12px)

# Example code for ref:
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import layoutFeature from '@/assets/layout-feature.jpg';
import editTaskFeature from '@/assets/edit-task-feature.jpg';
import nextDayFeature from '@/assets/next-day-feature.jpg';
import decisionLogFeature from '@/assets/decision-log-feature.jpg';
import integrationsFeature from '@/assets/integrations-feature.jpg';

interface FeatureCard {
  id: string;
  title: string;
  description?: string;
  image: string;
}

interface FeatureGroup {
  id: 'personalisation' | 'automation' | 'streamlined';
  label: string;
  cards: FeatureCard[];
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
        image: layoutFeature
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
        image: editTaskFeature
      },
      {
        id: 'a2',
        title: 'Create your next day in 1 click',
        description: 'YourMum rolls over incomplete, recurring, and calendar tasks into your next day automatically.',
        image: nextDayFeature
      },
      {
        id: 'a3',
        title: 'Task decomposition',
        description: 'Break down complex tasks into smaller, actionable steps with ease.',
        image: decisionLogFeature
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
        image: integrationsFeature
      }
    ]
  }
];

export function FeaturesNew() {
  const [activeGroup, setActiveGroup] = useState<'personalisation' | 'automation' | 'streamlined'>('personalisation');
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const toggleRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation for toggles
  const handleKeyDown = useCallback((event: KeyboardEvent, currentIndex: number) => {
    const groups = featureGroups.map(g => g.id);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : groups.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < groups.length - 1 ? currentIndex + 1 : 0;
        break;
      default:
        return;
    }

    setActiveGroup(groups[newIndex]);
    // Focus the new tab
    const newTab = toggleRef.current?.children[newIndex] as HTMLButtonElement;
    newTab?.focus();
  }, []);

  // Set up intersection observer for cards
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setVisibleCards(new Set(featureGroups.flatMap(group => group.cards.map(card => card.id))));
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute('data-card-id');
            if (cardId) {
              setVisibleCards(prev => new Set([...prev, cardId]));
            }
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Observe cards when active group changes
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      
      const currentGroup = featureGroups.find(g => g.id === activeGroup);
      if (currentGroup) {
        currentGroup.cards.forEach(card => {
          const element = cardsRef.current[card.id];
          if (element && observerRef.current) {
            observerRef.current.observe(element);
          }
        });
      }
    }
  }, [activeGroup]);

  // Handle back to top visibility for automation group
  useEffect(() => {
    if (activeGroup === 'automation') {
      const firstCard = cardsRef.current['a1'];
      if (firstCard && observerRef.current) {
        const backToTopObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              setShowBackToTop(!entry.isIntersecting);
            });
          },
          { threshold: 0.1 }
        );
        backToTopObserver.observe(firstCard);
        
        return () => backToTopObserver.disconnect();
      }
    } else {
      setShowBackToTop(false);
    }
  }, [activeGroup]);

  const handleGroupChange = (groupId: 'personalisation' | 'automation' | 'streamlined') => {
    setActiveGroup(groupId);
    setVisibleCards(new Set());
    
    // Reset scroll position to top of content area
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeGroupData = featureGroups.find(g => g.id === activeGroup);

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-foreground">Features</h1>
      </div>

      {/* Horizontal Toggle Group - Sticky */}
      <div className="feature-toggle-sticky mb-12 py-4" ref={toggleRef}>
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
                onClick={() => handleGroupChange(group.id)}
                onKeyDown={(e) => handleKeyDown(e.nativeEvent, index)}
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
            <div className={`
              ${activeGroup === 'automation' 
                ? 'space-y-8' 
                : 'flex justify-center'
              }
            `}>
              {activeGroupData.cards.map((card, index) => (
                <Card
                  key={card.id}
                  ref={(el) => (cardsRef.current[card.id] = el)}
                  data-card-id={card.id}
                  className={`
                    bg-feature-bg-pastel border-0 overflow-hidden
                    ${visibleCards.has(card.id) ? 'feature-card-enter' : 'opacity-0'}
                    ${activeGroup === 'automation' 
                      ? 'w-full scroll-mt-8' 
                      : 'max-w-4xl w-full'
                    }
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
                        <h2 className="text-3xl font-bold text-foreground mb-6 leading-tight">
                          {card.title}
                        </h2>
                        {card.description && (
                          <p className="text-lg text-muted-foreground leading-relaxed">
                            {card.description}
                          </p>
                        )}
                      </div>
                      <div className="relative overflow-hidden">
                        <div 
                          className="w-full h-80 lg:h-full bg-muted flex items-center justify-center"
                          style={{ aspectRatio: '16/10' }}
                        >
                          <img
                            src={card.image}
                            alt={`Feature illustration for ${card.title}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="text-muted-foreground text-center p-8">
                                    <div class="text-sm font-mono">PLACEHOLDER_${card.id.toUpperCase()}</div>
                                  </div>
                                `;
                              }
                            }}
                          />
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

      {/* Back to Top Button for Automation */}
      {showBackToTop && activeGroup === 'automation' && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-20 rounded-full w-12 h-12 p-0 shadow-lg"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      )}
    </section>
  );
}
