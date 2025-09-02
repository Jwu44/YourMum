'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/parts/home/Navigation'
import Footer from '@/components/parts/home/Footer'

export default function TermsOfService (): React.JSX.Element {
  const router = useRouter()

  const handleGetStarted = async (): Promise<void> => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation handleGetStarted={handleGetStarted} />
      <div className="max-w-6xl mx-auto px-4 py-12 pt-24">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-3">Terms of Service</h1>

          <div className="text-sm text-muted-foreground mb-5">
            <strong>Effective Date:</strong> 02/09/2025
            <br />
            <strong>Last Updated:</strong> 02/09/2025
          </div>

          <div className="mb-5">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of our web application, APIs, and related services (collectively, the &quot;Service&quot;). By using our Service, you agree to these Terms. If you do not agree, please stop using the Service.
            </p>
          </div>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">1. Eligibility</h2>
            <p>
              You must be at least 18 years old to use the Service. By using the Service, you confirm you have the legal capacity to enter into these Terms.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">2. Accounts and Authentication</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may sign up or log in using your Google account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>We may suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">3. Data We Collect</h2>
            <p className="mb-3">When you use the Service, we may collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Google account details (email, display name, profile photo).</li>
              <li><strong>Calendar Data:</strong> Google Calendar events and metadata, accessed only in read-only mode when you grant permission.</li>
              <li><strong>Task Data:</strong> Tasks, to-dos, microsteps, categories, and completion status, stored persistently in our database (MongoDB).</li>
              <li><strong>Preferences:</strong> Work schedule, energy patterns, life priorities.</li>
              <li><strong>Usage Analytics:</strong> Interactions with the Service, collected via third-party analytics tools such as Mixpanel and PostHog.</li>
            </ul>
            <p className="mt-4">See our Privacy Policy for details.</p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">4. Use of Data</h2>
            <p className="mb-3">We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide core functionality (generate personalized schedules, manage tasks, sync calendar data).</li>
              <li>Deliver AI-powered recommendations and improvements.</li>
              <li>Improve the Service, fix bugs, and enhance user experience.</li>
            </ul>
            <p className="mt-4">We never sell or rent your data.</p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Misuse the Service, disrupt servers, or attempt unauthorized access.</li>
              <li>Reverse engineer or copy the Service.</li>
              <li>Use the Service to create competing products.</li>
              <li>Upload or store harmful, illegal, or sensitive data (e.g., health records, financial data, or confidential business information).</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">6. Payment and Subscriptions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service offers both free and paid tiers.</li>
              <li>Payments are securely processed by Stripe. We do not store card details.</li>
              <li>All purchases are non-refundable, except where required by law.</li>
              <li>Subscriptions renew automatically unless canceled before the billing date.</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <p>
              All content, code, and design of the Service belong to YourMum or our licensors. You may not copy, distribute, or create derivative works without permission.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these Terms or misuse the Service. You may stop using the Service at any time by deleting your account in the Settings page.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service is provided &quot;as is&quot; without warranties of any kind.</li>
              <li>AI-generated schedules and recommendations are for guidance only. They are not professional, medical, or mental health advice. You are responsible for your own decisions.</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, YourMum is not liable for indirect, incidental, or consequential damages arising from use of the Service.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will notify you by email or in-app. Continued use of the Service means you accept the updated Terms.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of New South Wales, Australia.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:{' '}
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
