import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Star } from 'lucide-react'
import { type WithHandleGetStarted } from '@/lib/types'

const PricingSection = ({ handleGetStarted }: WithHandleGetStarted) => {


  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      credits: '5 credits total',
      features: [
        '5 AI credits (lifetime)',
        'Schedule generation (1 credit)',
        'Task breakdown (1 credit)',
        'Free categorization',
        'Google Calendar sync'
      ],
      cta: 'Try For Free',
      popular: false,
      isProPlan: false
    },
    {
      name: 'Pro',
      price: '$7',
      period: 'month',
      credits: '40 credits/month',
      features: [
        '40 AI credits monthly',
        'Everything in Free',
        'Slack integration',
        'Priority support',
        'Advanced scheduling'
      ],
      cta: 'Choose Pro',
      popular: true,
      isProPlan: true
    }
  ]

  return (
    <section className="py-20 bg-background" id="pricing">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            Start For Free
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Try YourMum for free and upgrade to Pro as you grow.
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
                <div className="mb-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-card-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium">{plan.credits}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-card-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.isProPlan ? (
                <a
                  href="https://buy.stripe.com/6oU3cvb8IcF2bxCcd22cg00"
                  target="_self"
                  className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-8 w-full bg-gradient-primary hover:opacity-90 shadow-glow text-primary-foreground`}
                >
                  {plan.cta}
                </a>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  size="lg"
                  onClick={handleGetStarted}
                >
                  {plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
