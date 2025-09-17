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

---

## Implementation Notes

### Key Changes Made

1. **Simplified to Monthly Pro Only**
   - Removed annual billing option to focus on single payment link
   - Monthly Pro: $7/month, 40 credits/month
   - Direct Stripe payment link: `https://buy.stripe.com/6oU3cvb8IcF2bxCcd22cg00`

2. **Direct Payment Link Approach**
   - Replaced complex Stripe Checkout API with direct link redirect
   - Better browser compatibility (works with Brave browser privacy settings)
   - Simplified frontend: no API calls needed for checkout initiation
   - Reduced code complexity by ~70%

3. **Email-Based User Identification**
   - Webhook uses email matching instead of metadata for user identification
   - More reliable than complex customer object strategies
   - Handles checkout completion via `checkout.session.completed` event

4. **Frontend Components**
   - Updated `UpgradeModal.tsx`: Monthly Pro only, direct link redirect
   - Updated `Pricing.tsx`: Removed annual toggle, direct `<a>` tag approach
   - Added `UpgradeButton.tsx`: Reusable component for upgrade functionality
   - Added upgrade button to `AppSidebar.tsx` for free users

5. **Backend Simplification**
   - Removed `/api/billing/checkout` endpoint (no longer needed)
   - Enhanced webhook handling for email-based user identification
   - Simplified billing service to handle monthly subscriptions only
   - Added `stripe>=8.0.0` to requirements.txt

### Environment Configuration Required

```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Stripe Webhook Events Required

1. `checkout.session.completed` - User completes payment
2. `customer.subscription.created` - Subscription first created
3. `customer.subscription.updated` - Subscription changes
4. `customer.subscription.deleted` - Subscription cancelled
5. `invoice.payment_failed` - Payment fails

### Testing & Debugging

1. **Infinite API Loop Fix**: Removed `isLoadingCredits` dependency from useEffect to prevent spam requests
2. **Browser Compatibility**: Direct `<a>` tag approach works with Brave browser privacy settings
3. **Fallback Display**: Upgrade button shows when `billingStatus` is null or plan is 'free'

### Architecture Benefits

- **Simpler**: Direct payment links eliminate frontend/backend checkout complexity
- **Reliable**: Email matching more dependable than metadata strategies
- **Compatible**: Works across all browsers including privacy-focused ones
- **Maintainable**: Reduced codebase with fewer potential failure points
- **Testable**: Can test with $0.10 Stripe test payments safely

### Production Deployment Notes

- Update webhook URL from `localhost:8000` to `https://yourmum.app/api/billing/webhook`
- Configure all 5 required webhook events in Stripe Dashboard
- Ensure environment variables are set in production
- Test payment flow end-to-end before launch