'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/parts/home/Navigation'
import Footer from '@/components/parts/home/Footer'

export default function PrivacyPolicy (): React.JSX.Element {
  const router = useRouter()

  const handleGetStarted = async (): Promise<void> => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation handleGetStarted={handleGetStarted} />
      <div className="max-w-6xl mx-auto px-4 py-12 pt-24">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-3">Privacy Policy</h1>

          <div className="text-sm text-muted-foreground mb-5">
            <strong>Effective Date:</strong> 02/09/2025
            <br />
            <strong>Last Updated:</strong> 02/09/2025
          </div>

          <div className="mb-5">
            <p>
              This privacy policy for YourMum (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) explains what information we collect,
              how we use it, and the choices available to you when you use our web app and API. By using our
              services, you agree to the practices described here.
            </p>
          </div>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Google account info (email, display name, profile photo), preferences, work schedule, energy patterns, life priorities.</li>
              <li><strong>Calendar Data:</strong> Google Calendar events, event details, times, descriptions, sync preferences.</li>
              <li><strong>Task Data:</strong> Tasks, to-dos, microsteps, categories, priorities, completion status, and AI suggestions.</li>
              <li><strong>Payment Data:</strong> Processed securely by Stripe (we don&apos;t store card details).</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Core Services:</strong> Generate personalized schedules, organize tasks, sync with Google Calendar.</li>
              <li><strong>AI Features:</strong> Provide task recommendations, optimize your schedule, improve with feedback.</li>
              <li><strong>Service Improvement:</strong> Analyze usage to improve features, fix bugs, and build new functionality.</li>
            </ul>
            <p className="mt-4">We do not sell, rent, or trade your data.</p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">3. Data Sharing and Third-Party Services</h2>
            <p className="mb-3">We use trusted providers to deliver our service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google:</strong> Authentication & Calendar integration</li>
              <li><strong>Firebase:</strong> User authentication</li>
              <li><strong>Stripe:</strong> Payments</li>
              <li><strong>Anthropic (Claude):</strong> AI task analysis & scheduling</li>
              <li><strong>MongoDB:</strong> Secure data storage</li>
              <li><strong>Railway:</strong> Backend hosting</li>
              <li><strong>Vercel:</strong> Frontend hosting</li>
            </ul>
            <p className="mt-4">We may also disclose information if required by law or to protect our rights and safety.</p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data encrypted in transit (HTTPS/TLS) and at rest.</li>
              <li>OAuth tokens stored securely.</li>
              <li>Access controls and regular reviews in place.</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p className="mb-3">Depending on where you live (Australia, EU, California), you may have rights to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your data.</li>
              <li>Delete your data or account (processed within 30 days).</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p>
              We keep your data only as long as needed to provide the service. Deleted accounts are permanently removed
              from our systems within 30 days, unless retention is required by law.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">7. Updates to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we&apos;ll post the updated version on this
              page with a new &quot;Last Updated&quot; date.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p>
              If you have questions, please contact us at{' '}
              <a
                href="mailto:justin.yourmum4444@gmail.com"
                className="text-primary hover:underline"
              >
                justin.yourmum4444@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
