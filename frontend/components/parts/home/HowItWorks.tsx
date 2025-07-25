import { ArrowRight, Plus, Brain, CheckCircle } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      icon: Plus,
      title: 'Add Your Tasks',
      description: 'Simply input your tasks, deadlines, and preferences. yourdai understands natural language.'
    },
    {
      icon: Brain,
      title: 'AI Does the Planning',
      description: 'Our AI analyzes your workload, priorities, and schedule to create the optimal daily plan.'
    },
    {
      icon: CheckCircle,
      title: 'Execute & Adapt',
      description: 'Follow your personalized schedule and watch as AI learns and adapts to your working style.'
    }
  ]

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
  )
}

export default HowItWorks
