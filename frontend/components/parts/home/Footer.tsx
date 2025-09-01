import Image from 'next/image'

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <Image
                src="/favicon-96x96.png"
                alt="YourMum logo"
                width={124}
                height={32}
                className="h-8 w-auto"
                priority
                quality={100}
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Transform your productivity with AI-powered daily planning.
              Accomplish more, stress less, and achieve your goals with intelligent task management.
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex justify-between items-center text-muted-foreground">
          <p>&copy; 2025 YourMum. All rights reserved.</p>
          <div className="flex gap-6">
            <a 
              href="https://www.notion.so/Terms-and-Conditions-25fe0fd13b638040a916cf37434cb6b0?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Terms and Conditions
            </a>
            <a 
              href="https://www.notion.so/Privacy-Policy-25fe0fd13b6380198c4ad8ff003dda8a?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
