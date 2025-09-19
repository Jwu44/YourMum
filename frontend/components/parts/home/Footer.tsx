import Image from 'next/image'
import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="border-t border-border mt-8 pt-8 flex justify-between items-center text-muted-foreground">
          <div className="flex items-center gap-3">
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
            <p>&copy; 2025 YourMum. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <Link
              href="mailto:justin.yourmum4444@gmail.com"
              className="hover:text-foreground transition-colors"
            >
              Contact Us
            </Link>
            <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
