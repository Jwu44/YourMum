import { CheckCircle } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">yourdai</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Transform your productivity with AI-powered daily planning.
              Accomplish more, stress less, and achieve your goals with intelligent task management.
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2025 yourdai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
