Epic: Home Page Reskin

# Task 1: Reskin Navigation.tsx 
## Status: ✅ Done

## Requirements
- Replace current Navigation.tsx with the component from example code implementation but with these changes:
    - Replace "Logo CryptoTrade" with current Logo and text "YourMum".
    - Navitems: Pricing, CTA: "Try YourMum"
- Maintain the transluscent like background as user scrolls

## Example code implementation
import { useState, useEffect } from "react";
import { Command, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'testimonials') {
      const testimonialSection = document.querySelector('.animate-marquee');
      if (testimonialSection) {
        const yOffset = -100; // Offset to account for the fixed header
        const y = testimonialSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else if (sectionId === 'cta') {
      const ctaSection = document.querySelector('.button-gradient');
      if (ctaSection) {
        const yOffset = -100;
        const y = ctaSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const navItems = [
    { name: "Features", href: "#features", onClick: () => scrollToSection('features') },
    { name: "Prices", href: "#pricing", onClick: () => scrollToSection('pricing') },
    { name: "Testimonials", href: "#testimonials", onClick: () => scrollToSection('testimonials') },
  ];

  return (
    <header
      className={`fixed top-3.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 rounded-full ${
        isScrolled 
          ? "h-14 bg-[#1B1B1B]/40 backdrop-blur-xl border border-white/10 scale-95 w-[90%] max-w-2xl" 
          : "h-14 bg-[#1B1B1B] w-[95%] max-w-3xl"
      }`}
    >
      <div className="mx-auto h-full px-6">
        <nav className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <Command className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">CryptoTrade</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.onClick) {
                    item.onClick();
                  }
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                {item.name}
              </a>
            ))}
            <Button 
              onClick={() => scrollToSection('cta')}
              size="sm"
              className="button-gradient"
            >
              Start Trading
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
              <SheetContent className="bg-[#1B1B1B]">
                <div className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-lg text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMobileMenuOpen(false);
                        if (item.onClick) {
                          item.onClick();
                        }
                      }}
                    >
                      {item.name}
                    </a>
                  ))}
                  <Button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      scrollToSection('cta');
                    }}
                    className="button-gradient mt-4"
                  >
                    Start Trading
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navigation;

# Task 2: Reskin @Hero.tsx
## Status: ✅ Done

## Requirements
- Convert current horizontal layout to vertical stack with content in the following order:
  - H1: Let YourMum plan your day
  - H2: Don't waste time on admin overhead and lock in with a personalised schedule YourMum made
  - CTA: Try YourMum
  - @Dashboard image
- Propose a light purple gradient background with similar effects to the sample backgrounds from granola.ai and willow

# Task 3: Reskin @HowItWorks.tsx
## Status: To do

## Requirements
- h1: How it works
- h2: Get started with YourMum in three steps 
- card 1:
  - h3: Create task
  - p: Add unsynced tasks you have for your current day.
  - screen recording: @demo1
- card 2:
  - h3: Fill out preferences
  - p: Provide details about your lifestyle so YourMum can create a personalised schedule.
- card 3: Link apps
  - h3: Integrate YourMum with Google Calendar, Slack and more (coming soon) to automatically create tasks.
- on hover, play the screen recording automatically
  - ensure the screen recording fills up the card  d
## Sample code (to be specced out and overriden):
import { useState } from 'react';

const HowItWorks = () => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      title: "Create task",
      description: "Add any tasks you have for your current day that weren't synced.",
      image: "/lovable-uploads/fe96ea52-b7ac-427f-9a5c-9232346c3607.png",
      delay: "0ms"
    },
    {
      id: 2,
      title: "Fill out preferences",
      description: "Provide details about your lifestyle so YourMum can create a personalised schedule.",
      image: "/lovable-uploads/e06566f3-4f33-4c34-a452-e46c4ca4b1be.png",
      delay: "200ms"
    },
    {
      id: 3,
      title: "Link integrations",
      description: "Connect to third party apps like Google Calendar and Slack to have tasks automatically created.",
      image: "/lovable-uploads/504bed40-c782-4e0c-89eb-d1907d62787d.png",
      delay: "400ms"
    }
  ];

  return (
    <section className="relative py-24 px-6 bg-gradient-subtle overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-muted/10" />
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl opacity-15" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20 animate-fade-in-up">
          <h2 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            How it works
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Get started with <span className="text-primary font-semibold">YourMum</span> in three simple steps and let us handle the rest
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="group relative"
              style={{
                animationDelay: step.delay,
                animation: `fade-in-up 0.8s ease-out forwards ${step.delay}`
              }}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              {/* Step Card */}
              <div className={`relative bg-gradient-card backdrop-blur-sm border border-border/50 rounded-3xl p-10 h-full transition-all duration-500 hover:shadow-glow hover:border-primary/40 hover:-translate-y-3 hover:animate-tilt ${
                hoveredStep === step.id ? 'shadow-glow border-primary/40 -translate-y-3' : 'shadow-subtle'
              }`}>
                {/* Step Number */}
                <div className="absolute -top-6 left-10">
                  <div className={`w-12 h-12 bg-gradient-primary text-primary-foreground rounded-2xl flex items-center justify-center font-bold text-lg shadow-elevated transition-all duration-500 ${
                    hoveredStep === step.id ? 'scale-110 animate-glow' : ''
                  }`}>
                    {step.id}
                  </div>
                </div>

                {/* Image Container */}
                <div className="relative mb-8 bg-gradient-subtle rounded-2xl p-6 overflow-hidden backdrop-blur-sm border border-primary/10">
                  <div className="relative aspect-video group-hover:perspective-1000">
                    <img
                      src={step.image}
                      alt={step.title}
                      className={`w-full h-full object-cover rounded-xl transition-all duration-700 ${
                        hoveredStep === step.id 
                          ? 'scale-110 shadow-2xl rotate-1' 
                          : 'scale-100'
                      }`}
                    />
                    {/* Glassmorphism Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary-glow/20 rounded-xl transition-all duration-500 ${
                      hoveredStep === step.id ? 'opacity-100 backdrop-blur-[2px]' : 'opacity-0'
                    }`} />
                    
                    {/* Interactive Glow Effect */}
                    <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                      hoveredStep === step.id ? 'shadow-[0_0_30px_rgba(139,92,246,0.3)]' : ''
                    }`} />
                  </div>
                  
                  {/* Multiple floating elements */}
                  {hoveredStep === step.id && (
                    <>
                      <div className="absolute top-3 right-3">
                        <div className="w-2 h-2 bg-primary rounded-full animate-float shadow-lg shadow-primary/50" style={{ animationDelay: '0s' }} />
                      </div>
                      <div className="absolute top-6 right-8">
                        <div className="w-1.5 h-1.5 bg-primary-glow rounded-full animate-float shadow-lg shadow-primary-glow/50" style={{ animationDelay: '0.5s' }} />
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <div className="w-2.5 h-2.5 bg-primary/70 rounded-full animate-float shadow-lg shadow-primary/30" style={{ animationDelay: '1s' }} />
                      </div>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-6">
                  <h3 className={`text-3xl font-bold transition-all duration-500 ${
                    hoveredStep === step.id 
                      ? 'text-primary transform scale-105' 
                      : 'text-foreground'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-muted-foreground leading-relaxed text-lg transition-all duration-300 ${
                    hoveredStep === step.id ? 'text-foreground/80' : ''
                  }`}>
                    {step.description.split(' ').map((word, wordIndex) => {
                      const highlightWords = ['YourMum', 'personalised', 'Google Calendar', 'Slack', 'tasks', 'synced'];
                      const isHighlight = highlightWords.some(hw => word.toLowerCase().includes(hw.toLowerCase()));
                      return (
                        <span 
                          key={wordIndex}
                          className={isHighlight ? 'text-primary font-medium' : ''}
                        >
                          {word}{' '}
                        </span>
                      );
                    })}
                  </p>
                </div>

                {/* Interactive Arrow */}
                <div className={`absolute bottom-8 right-8 transition-all duration-500 ${
                  hoveredStep === step.id 
                    ? 'opacity-100 translate-x-0 rotate-0' 
                    : 'opacity-0 translate-x-3 rotate-12'
                }`}>
                  <div className="w-10 h-10 bg-gradient-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-elevated group-hover:animate-glow">
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Enhanced Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-1 z-10">
                  <div className="relative w-full h-full bg-gradient-to-r from-border via-primary/30 to-border rounded-full">
                    <div className={`absolute inset-0 bg-gradient-primary rounded-full transition-all duration-1000 ${
                      hoveredStep === step.id || hoveredStep === step.id + 1
                        ? 'w-full opacity-100' 
                        : 'w-0 opacity-0'
                    }`} />
                    {/* Animated dot */}
                    <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full transition-all duration-1000 ${
                      hoveredStep === step.id || hoveredStep === step.id + 1
                        ? 'left-full -translate-x-3 opacity-100 animate-pulse' 
                        : 'left-0 opacity-0'
                    }`} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced Call to Action */}
        <div className="text-center mt-24 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          <div className="relative inline-block">
            <button className="group relative bg-gradient-primary hover:shadow-glow text-primary-foreground px-12 py-5 rounded-2xl font-bold text-xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <span className="relative z-10 flex items-center gap-3">
                Try YourMum
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-glow via-primary to-primary-glow bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
            {/* Decorative elements */}
            <div className="absolute -inset-2 bg-gradient-primary rounded-3xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500 -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

## Ts config example
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
          muted: "hsl(var(--primary-muted))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-subtle': 'var(--gradient-subtle)',
      },
      boxShadow: {
        'subtle': 'var(--shadow-subtle)',
        'elevated': 'var(--shadow-elevated)',
        'glow': 'var(--shadow-glow)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "zoom-in": {
          "0%": {
            transform: "scale(0.9)",
            opacity: "0"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)"
          },
          "50%": {
            transform: "translateY(-10px)"
          }
        },
        "glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.1)"
          },
          "50%": {
            boxShadow: "0 0 30px hsl(var(--primary) / 0.2)"
          }
        },
        "tilt": {
          "0%": {
            transform: "perspective(400px) rotateX(0deg) rotateY(0deg)"
          },
          "100%": {
            transform: "perspective(400px) rotateX(1deg) rotateY(-2deg)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "zoom-in": "zoom-in 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        "tilt": "tilt 0.6s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
