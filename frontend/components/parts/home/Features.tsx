import { Sparkles, Zap, Workflow } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Sparkles,
      title: "Personalisation",
      description: "Configure your work schedule, life priorities, and energy patterns. yourdai learns how you work best.",
      highlight: "Smart personalization"
    },
    {
      icon: Zap,
      title: "Automation",
      description: "Let AI handle the heavy lifting with smart integrations and intelligent task management.",
      highlight: "Intelligent automation"
    },
    {
      icon: Workflow,
      title: "Integration",
      description: "Connect all your productivity tools in one unified experience with real-time syncing.",
      highlight: "Seamless workflow"
    }
  ];

  return (
    <section className="py-32 bg-muted/30">
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center mb-20">
        <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
          Everything you need to master your day
        </h2>
        <p className="text-xl text-muted-foreground leading-8">
          Three core pillars that make yourdai the smartest way to plan your day
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {features.map((feature, index) => (
          <div 
            key={feature.title} 
            className="text-center group animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="mb-8 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">{feature.title}</h3>
            <p className="text-muted-foreground leading-7 mb-4">
              {feature.description}
            </p>
            <div className="text-sm font-medium text-primary">
              {feature.highlight}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

export default Features; 