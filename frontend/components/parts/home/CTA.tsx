import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import { WithHandleGetStarted } from '@/lib/types';

const CTA = ({ handleGetStarted }: WithHandleGetStarted) => {
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
            &ldquo;yourdai has completely transformed how I manage my daily tasks. 
            The AI suggestions are spot-on and I&apos;m more productive than ever!&rdquo;
          </p>
          <p className="text-primary-foreground/70 mt-2">- Sarah Johnson, Product Manager</p>
        </div>
        
        <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-6 animate-slide-up">
          Ready to supercharge your productivity?
        </h2>
        <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Join thousands of users who have already transformed their daily planning with yourdai&apos;s AI-powered approach.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="premium" 
            size="lg" 
            className="bg-background text-primary hover:bg-background/90 px-8 py-4 text-lg shadow-elegant"
            onClick={handleGetStarted}
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

export default CTA;