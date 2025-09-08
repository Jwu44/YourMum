import { Button } from '@/components/ui/button'
import { type WithHandleGetStarted } from '@/lib/types'
import Image from 'next/image'

const Hero = ({ handleGetStarted }: WithHandleGetStarted) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16 overflow-hidden">
      {/* Multiple gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-lavender-50 to-indigo-50"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-100/30 via-transparent to-transparent"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* H1 Title */}
        <h1 
          className="text-5xl font-bold text-gray-900 leading-tight opacity-0 translate-y-8 animate-fade-in-up"
          style={{ fontSize: '48px', animationDelay: '0.1s' }}
        >
          Let YourMum plan your day
        </h1>

        {/* H2 Subtitle */}
        <p 
          className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed opacity-0 translate-y-8 animate-fade-in-up"
          style={{ fontSize: '20px', animationDelay: '0.2s' }}
        >
          Don't waste time on admin overhead and lock in with a personalised schedule YourMum made
        </p>

        {/* CTA Button */}
        <div className="opacity-0 translate-y-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Button 
            variant="premium" 
            size="lg" 
            className="px-8 py-4 button-gradient"
            style={{ fontSize: '16px' }}
            onClick={handleGetStarted}
          >
            Try YourMum
          </Button>
        </div>

        {/* Dashboard Image */}
        <div className="opacity-0 translate-y-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="relative w-full max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-400/20 via-purple-300/30 to-indigo-400/20 rounded-3xl blur-xl"></div>
            <div className="relative">
              <Image
                src="/images/home/Dashboard populated.png"
                alt="YourMum Dashboard"
                width={1200}
                height={800}
                className="w-full h-auto rounded-2xl shadow-2xl border border-purple-200/50"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
