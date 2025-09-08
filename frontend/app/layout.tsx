import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/auth/AuthContext'
import { RouteGuard } from '@/auth/RouteGuard'
import { FormProvider } from '@/lib/FormContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import { ToasterClient } from '@/components/ui/toaster-client'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'YourMum',
  description: 'your personalised and automated to do list',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  manifest: '/site.webmanifest',
  other: {
    'apple-mobile-web-app-title': 'YourMum'
  }
}

export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="YourMum" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <AuthProvider>
          <OnboardingProvider>
            <FormProvider>
              <RouteGuard>
                  {children}
              </RouteGuard>
            </FormProvider>
          </OnboardingProvider>
        </AuthProvider>
        <ToasterClient />
      </body>
    </html>
  )
}
