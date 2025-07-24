# TASK-12: Reskin home page
Status: To do

## Problem
Home page is outdated

## Requirements
- ensure clicking these CTAs should direct user for login just like how we're currently handling it:
    - Sign In
    - Start Free Trial
    - Get Started
- use the following components as reference:
- CTA: "import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary opacity-95"></div>
      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <div className="mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
            ))}
          </div>
          <p className="text-primary-foreground/80 text-lg">
            "yourdai has completely transformed how I manage my daily tasks. 
            The AI suggestions are spot-on and I'm more productive than ever!"
          </p>
          <p className="text-primary-foreground/70 mt-2">- Sarah Johnson, Product Manager</p>
        </div>
        
        <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-6 animate-slide-up">
          Ready to supercharge your productivity?
        </h2>
        <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Join thousands of users who have already transformed their daily planning with yourdai's AI-powered approach.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="premium" 
            size="lg" 
            className="bg-background text-primary hover:bg-background/90 px-8 py-4 text-lg shadow-elegant"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <div className="text-primary-foreground/70 text-sm">
            14-day free trial • No credit card required
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="text-3xl font-bold text-primary-foreground mb-2">10,000+</div>
            <div className="text-primary-foreground/70">Active Users</div>
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="text-3xl font-bold text-primary-foreground mb-2">95%</div>
            <div className="text-primary-foreground/70">Satisfaction Rate</div>
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-3xl font-bold text-primary-foreground mb-2">2M+</div>
            <div className="text-primary-foreground/70">Tasks Completed</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;"
- Features: "import { Brain, Calendar, Clock, Users, Zap, Shield } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Scheduling",
      description: "Let AI automatically organize your tasks based on priority, deadlines, and your personal productivity patterns."
    },
    {
      icon: Calendar,
      title: "Smart Calendar Integration",
      description: "Seamlessly sync with your existing calendars and get intelligent suggestions for optimal task scheduling."
    },
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Monitor how long tasks actually take and improve your time estimation for better planning."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share projects, assign tasks, and collaborate with your team in real-time with smart notifications."
    },
    {
      icon: Zap,
      title: "Productivity Analytics",
      description: "Get insights into your productivity patterns and receive personalized recommendations for improvement."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and secure. We prioritize your privacy with enterprise-grade security."
    }
  ];

  return (
    <section className="py-20 bg-background" id="features">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            Everything you need to stay
            <span className="text-primary block">organized and productive</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            yourdai combines the power of artificial intelligence with intuitive design 
            to help you accomplish more in less time.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elegant animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
"
- Footer: "import { CheckCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">yourdai</span>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              Transform your productivity with AI-powered daily planning. 
              Accomplish more, stress less, and achieve your goals with intelligent task management.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-2 text-gray-600">
              <li><a href="#" className="hover:text-purple-600 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-purple-600 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-purple-600 transition-colors">API</a></li>
              <li><a href="#" className="hover:text-purple-600 transition-colors">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2 text-gray-600">
              <li><a href="#" className="hover:text-purple-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-purple-600 transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-purple-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-purple-600 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-500">
          <p>&copy; 2024 yourdai. All rights reserved. Built with ❤️ for productivity enthusiasts.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;"

- Hero: "import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative bg-gradient-hero min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left animate-fade-in">
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center mr-3 shadow-glow">
              <CheckCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">yourdai</h1>
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
            <Button variant="premium" size="lg" className="px-8 py-4 text-lg">
              Get Started Free
            </Button>
            <Button variant="hero" size="lg" className="px-8 py-4 text-lg">
              Watch Demo
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
  );
};

export default Hero;
"

- How it works: "import { ArrowRight, Plus, Brain, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Plus,
      title: "Add Your Tasks",
      description: "Simply input your tasks, deadlines, and preferences. yourdai understands natural language."
    },
    {
      icon: Brain,
      title: "AI Does the Planning",
      description: "Our AI analyzes your workload, priorities, and schedule to create the optimal daily plan."
    },
    {
      icon: CheckCircle,
      title: "Execute & Adapt",
      description: "Follow your personalized schedule and watch as AI learns and adapts to your working style."
    }
  ];

  return (
    <section className="py-20 bg-gradient-section">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            How yourdai works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes with our simple three-step process
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-center space-y-8 lg:space-y-0 lg:space-x-8">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col lg:flex-row items-center">
              <div 
                className="bg-card rounded-2xl p-8 shadow-elegant border border-border max-w-sm text-center hover:shadow-glow transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="bg-gradient-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold shadow-glow">
                  {index + 1}
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
      </div>
    </section>
  );
};

export default HowItWorks;"

- Navigation: "import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Menu, X, ChevronDown } from "lucide-react";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center mr-3">
              <CheckCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">yourdai</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <div className="relative group">
                <button className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                  Solutions
                  <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-elegant opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-2">
                    <a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                      Personal Planning
                    </a>
                    <a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                      Team Management
                    </a>
                    <a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                      Enterprise
                    </a>
                  </div>
                </div>
              </div>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow">
                Start Free Trial
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border animate-fade-in">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#features" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#solutions" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Solutions
              </a>
              <a href="#pricing" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#about" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <div className="pt-4 space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Sign In
                </Button>
                <Button size="sm" className="w-full bg-gradient-primary hover:opacity-90">
                  Start Free Trial
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;"

- Pricing: "import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with AI-powered planning",
      features: [
        "Up to 50 tasks per month",
        "Basic AI scheduling",
        "Calendar integration",
        "Mobile app access",
        "Email support"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$12",
      period: "per month",
      description: "Ideal for professionals and power users",
      features: [
        "Unlimited tasks",
        "Advanced AI insights",
        "Team collaboration (up to 5 members)",
        "Priority support",
        "Custom integrations",
        "Productivity analytics",
        "Time tracking"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Team",
      price: "$25",
      period: "per user/month",
      description: "Built for teams that want to achieve more together",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Advanced team analytics",
        "Custom workflows",
        "Admin controls",
        "SSO integration",
        "24/7 phone support"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <section className="py-20 bg-background" id="pricing">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            Choose your perfect
            <span className="text-primary block">productivity plan</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include our core AI features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-2xl p-8 border transition-all duration-300 hover:shadow-elegant ${
                plan.popular
                  ? "border-primary shadow-glow scale-105"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-card-foreground mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-card-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-card-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-gradient-primary hover:opacity-90 shadow-glow"
                    : ""
                }`}
                variant={plan.popular ? "premium" : "outline"}
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-muted-foreground">
            <span>✓ Cancel anytime</span>
            <span>✓ 30-day money back guarantee</span>
            <span>✓ No setup fees</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;"

css: "@tailwind base;
@tailwind components;
@tailwind utilities;

/* Definition of the design system. All colors, gradients, fonts, etc should be defined here. 
All colors MUST be HSL.
*/

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Brand Colors - Purple theme for yourdai */
    --primary: 258 92% 65%;
    --primary-foreground: 0 0% 100%;
    --primary-glow: 258 70% 75%;
    --primary-blue: 240 95% 70%;

    --secondary: 250 12% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 250 12% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 258 25% 93%;
    --accent-foreground: 258 92% 45%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 258 92% 65%;

    /* Enhanced gradients */
    --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)));
    --gradient-accent: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-blue)));
    --gradient-hero: linear-gradient(135deg, hsl(258 35% 97%), hsl(0 0% 100%));
    --gradient-section: linear-gradient(180deg, hsl(0 0% 100%), hsl(250 12% 98%));

    /* Shadows */
    --shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
    --shadow-glow: 0 0 40px hsl(var(--primary-glow) / 0.4);

    --radius: 0.75rem;

    --sidebar-background: 0 0% 98%;

    --sidebar-foreground: 240 5.3% 26.1%;

    --sidebar-primary: 240 5.9% 10%;

    --sidebar-primary-foreground: 0 0% 98%;

    --sidebar-accent: 240 4.8% 95.9%;

    --sidebar-accent-foreground: 240 5.9% 10%;

    --sidebar-border: 220 13% 91%;

    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 258 92% 75%;
    --primary-foreground: 222.2 84% 4.9%;
    --primary-glow: 258 70% 85%;
    --primary-blue: 240 95% 80%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 258 92% 75%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 258 92% 75%;

    /* Dark mode gradients */
    --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)));
    --gradient-accent: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-blue)));
    --gradient-hero: linear-gradient(135deg, hsl(222.2 84% 4.9%), hsl(217.2 32.6% 12%));
    --gradient-section: linear-gradient(180deg, hsl(222.2 84% 4.9%), hsl(217.2 32.6% 8%));
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}"
