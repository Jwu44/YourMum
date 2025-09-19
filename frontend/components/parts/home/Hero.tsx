import { Button } from '@/components/ui/button'
import { type WithHandleGetStarted } from '@/lib/types'
import Image from 'next/image'

const Hero = ({ handleGetStarted }: WithHandleGetStarted) => {
  return (
    <section className="relative min-h-[150vh] flex flex-col items-center justify-start px-4 pt-24 pb-20">
      {/* Multiple gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-lavender-50 to-indigo-50"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-100/30 via-transparent to-transparent"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl"></div>
      
      {/* Seamless fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-white/30 to-white"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center mt-16">
        {/* H1 Title */}
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight opacity-0 translate-y-8 animate-fade-in-up mb-5"
          style={{ animationDelay: '0.1s' }}
        >
          YourMum knows you best 🧙‍♀️
        </h1>

        {/* H2 Subtitle */}
        <p 
          className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed opacity-0 translate-y-8 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          Let YourMum organise your day so you can focus on what matters
        </p>

        {/* CTA Button */}
        <div className="opacity-0 translate-y-8 animate-fade-in-up mt-5" style={{ animationDelay: '0.3s' }}>
          <Button 
            variant="default" 
            size="lg" 
            className="px-8 py-4 button-gradient"
            style={{ fontSize: '16px' }}
            onClick={handleGetStarted}
          >
            Try YourMum
          </Button>
        </div>

        {/* Dashboard Image - Full width display like Linear */}
        <div className="opacity-0 translate-y-8 animate-fade-in-up mt-8 md:mt-40" style={{ animationDelay: '0.4s' }}>
          {/* Mobile: Full mobile dashboard image */}
          <div className="relative w-full overflow-hidden md:hidden">
            <div className="relative w-full aspect-[9/16] sm:aspect-[3/4] overflow-hidden rounded-lg p-0">
              <Image
                src="/images/home/Dashboard mobile.png"
                alt="YourMum Dashboard Mobile"
                width={390}
                height={844}
                className="w-full h-full object-contain"
                priority
                quality={100}
              />
            </div>
          </div>

          {/* Desktop: Keep original full-width behavior */}
          <div className="relative w-screen left-1/2 -translate-x-1/2 px-10 hidden md:block">
            {/* Full Width Image Container */}
            <div className="relative w-full overflow-hidden">
              <Image
                src="/images/home/Dashboard Edited.png"
                alt="YourMum Dashboard"
                width={1920}
                height={1080}
                className="w-full h-auto min-w-[1200px]"
                priority
                quality={100}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
