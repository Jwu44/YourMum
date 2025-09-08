import { Button } from '@/components/ui/button'
import { Check, Star } from 'lucide-react'
import { type WithHandleGetStarted } from '@/lib/types'

const PricingSection = ({ handleGetStarted }: WithHandleGetStarted) => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with AI-powered planning',
      features: [
        'Up to 50 tasks per month',
        'Basic AI scheduling',
        'Calendar integration',
        'Mobile app access',
        'Email support'
      ],
      cta: 'Start YourMum',
      popular: false
    },
    {
      name: 'Milf',
      price: '$12',
      period: 'month',
      description: 'Ideal for professionals and power users',
      features: [
        'Unlimited tasks',
        'Advanced AI insights',
        'Team collaboration (up to 5 members)',
        'Priority support',
        'Custom integrations',
        'Productivity analytics',
        'Time tracking'
      ],
      cta: 'Start Free Trial',
      popular: true
    }
  ]

  return (
    <section className="py-20 bg-background" id="pricing">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
        <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            Start For Free
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Try YourMum for free and upgrade as you grow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-2xl p-8 border transition-all duration-300 hover:shadow-elegant ${
                plan.popular
                  ? 'border-primary shadow-glow scale-105'
                  : 'border-border hover:border-primary/50'
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
                    ? 'bg-gradient-primary hover:opacity-90 shadow-glow'
                    : ''
                }`}
                variant={plan.popular ? 'premium' : 'outline'}
                size="lg"
                onClick={handleGetStarted}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
