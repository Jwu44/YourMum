## User Story: Stripe Payments + Credits System

**As a user**,
I want to upgrade from the Free plan to Pro (monthly or annual) using Stripe Checkout,
so that I can unlock 40 AI credits each month and continue using advanced features when my free credits are exhausted.

---

### Acceptance Criteria

1. **Plans & Pricing**

   * Pro plan available with two billing intervals:

     * **Monthly**: \$7 USD / month.
     * **Annual**: \$64 USD billed upfront (saves \$20 compared to 12× monthly).
   * Both plans reset credits monthly (40/month).
   * Free plan: 5 credits total (lifetime).

2. **Credits Rules**

   * Schedule generation = 1 credit.
   * Task breakdown = 1 credit.
   * Categorisation = 0 credits (free).
   * Credits are only deducted on **successful** operations.
   * If Pro → Free downgrade: remaining free credits = `max(0, 5 - lifetimeFreeUsed)`.

3. **Upgrade / Downgrade**

   * User clicks **“Choose Pro”** on @Pricing.tsx or **"Upgrade to Pro”**  in @Dashboard → redirected to Stripe Checkout (subscription mode).
   * On successful payment:

     * User upgraded to Pro.
     * Plan interval stored (monthly or annual).
     * Credits set to 40 for the current month.
     * Access to additional Slack integration.
   * On cancellation, payment failure, or subscription end:

     * User downgraded immediately to Free.
     * Free credits recalculated per lifetime rule.

4. **Subscription Management**

   * Users can access Stripe **Billing Portal** to cancel or manage their subscription.
   * No prorations or mid-cycle switches between monthly/annual.

5. **Backend (Flask)**

   * API endpoints:

     * `POST /api/billing/checkout` → returns Stripe Checkout URL.
     * `POST /api/billing/portal` → returns Billing Portal URL.
     * `POST /api/billing/webhook` → handles events.
   * Webhook events handled:

     * `checkout.session.completed` → create/update subscription, set plan to Pro.
     * `customer.subscription.updated` / `customer.subscription.deleted` → update plan or downgrade to Free.
     * `invoice.payment_failed` → downgrade to Free.

6. **Database (MongoDB)**
   Extend user schema with fields:

   ```json
   {
     "stripeCustomerId": "cus_123",
     "subscriptionId": "sub_123",
     "plan": "free" | "pro",
     "planInterval": "month" | "year" | null,
     "creditsThisMonth": 0,
     "nextCreditResetAt": "2025-10-01T00:00:00Z",
     "lifetimeFreeUsed": 0
   }
   ```

7. **Frontend (Next.js)**

   * “Choose Pro” button calls backend → Stripe Checkout.
   * “Manage Billing” button calls backend → Billing Portal.
   * Show current plan and remaining credits on dashboard.
   * Block actions if credits exhausted.

8. **Compliance**

   * Stripe receipts enabled.
   * Privacy Policy + Terms linked in Checkout.
   * No Stripe Tax required.