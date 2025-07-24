import { Brain, Calendar, Clock, Users, Zap, Shield } from "lucide-react";

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