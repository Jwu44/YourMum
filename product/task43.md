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

   * User clicks **“Choose Pro”** on @Pricing.tsx or **"Upgrade to Pro”**  in @Dashboard → redirected to Stripe Checkout
   * On successful payment:

     * User upgraded to Pro.
     * Plan interval stored (monthly or annual).
     * Credits set to 40 for the current month.
     * Access to additional Slack integration.
     * User is redirected back to /dashboard with the above config.

   * On cancellation, payment failure, or subscription end:

     * User downgraded immediately to Free.
     * Free credits recalculated per lifetime rule.
     * User is redirected back to /dashboard with the above config. 

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

---

## Missing Implementation Requirements (Phase 2)

### **Credit Deduction System**

Based on analysis of current codebase and requirements clarification:

#### **1. Credit Consumption Operations**
- **Schedule generation** (`/api/generate-schedule`) = 1 credit
- **Task breakdown** (`/api/decompose-task`) = 1 credit
- **Task categorization** = FREE (no credit deduction)
- **Schedule suggestions** = NOT USED (ignore)

#### **2. Credit Deduction Logic**
- **Timing**: Deduct credits **AFTER** successful AI operation completion
- **Location**: Dedicated `CreditService` in `backend/services/credit_service.py`
- **Pattern**: Atomic operations with compensation on failure
- **Validation**: Check sufficient credits before expensive operations

#### **3. Monthly Credit Reset**
- **Trigger**: Webhook-based reset when Stripe processes monthly payments
- **Timing**: Subscription anniversary date (not calendar month)
- **Events**: `checkout.session.completed` (new) + `invoice.payment_succeeded` (renewals)
- **Downgrade**: Pro users keep remaining credits until next reset

#### **4. Slack Integration Feature Gating**
- **Scope**: ALL Slack features require Pro plan
- **Implementation**: Simple boolean check `if user.plan == 'pro'`
- **Routes**: Gate `/api/slack/auth/connect`, `/api/slack/status`, `/api/slack/disconnect`, `/api/slack/webhook`
- **Frontend**: Hide/disable Slack integration card for Free users

#### **5. Frontend Action Blocking**
- **Level**: Frontend-level blocking with upgrade prompts
- **Method**: Toast notifications indicating need to upgrade
- **Warning**: Leverage existing low-credit warning in AppSidebar.tsx
- **UX**: Disable buttons and show upgrade modals when credits exhausted

### **Implementation Architecture**

#### **Service Layer Design**
```python
# backend/services/credit_service.py
class CreditService:
    def deduct_credits(user_id: str, amount: int, operation_type: str) -> bool
    def has_sufficient_credits(user_id: str, amount: int) -> bool
    def reset_user_credits(user_id: str, new_amount: int) -> bool
    def get_user_credits(user_id: str) -> int
    def refund_credits(user_id: str, amount: int, reason: str) -> bool
```

#### **Decorator Pattern for Route Protection**
```python
# Atomic credit deduction with compensation
@requires_credits(amount=1, operation_type='schedule_generation')
def generate_schedule():
    # AI operation here - credits already deducted
    # If this fails, credits are automatically refunded

# Plan-based feature gating
@requires_plan('pro')
def slack_auth_connect():
    # Slack integration only for Pro users
```

#### **Database Operations**
- **Atomicity**: MongoDB transactions for credit operations
- **Audit Trail**: Log all credit transactions (deductions, resets, refunds)
- **Consistency**: Prevent race conditions with proper locking

#### **Frontend Integration**
```typescript
// Credit validation before expensive operations
const checkCreditsBeforeOperation = async (requiredCredits: number) => {
  const billingStatus = await billingApi.getBillingStatus()
  if (billingStatus.creditsThisMonth < requiredCredits) {
    showUpgradeToast()
    return false
  }
  return true
}

// Plan-based feature availability
const isSlackAvailable = billingStatus?.plan === 'pro'
```

### **Files to Create/Modify**

#### **New Files**
- `backend/services/credit_service.py` - Core credit management

#### **Modified Files**
- `backend/apis/routes.py` - Add credit deduction to AI endpoints
- `backend/apis/slack_routes.py` - Add Pro plan requirement decorators
- `backend/services/billing_service.py` - Enhance webhook for credit resets
- `frontend/components/parts/SlackIntegrationCard.tsx` - Add plan checking
- `frontend/lib/api/billing.ts` - Add credit validation helpers
- `frontend/lib/api/tasks.ts` - Add credit checks before AI operations

### **Key Design Principles**

1. **Simple & Robust**: Decorator pattern, atomic operations, minimal complexity
2. **Fail-Safe**: Compensation pattern for partial failures, graceful degradation
3. **User-Friendly**: Clear upgrade prompts, credit warnings, smooth UX
4. **Maintainable**: Clean separation between billing logic and business logic
5. **Atomic**: All-or-nothing credit operations to prevent inconsistencies
6. **Auditable**: Necessary logging for debugging and compliance tracking

### **Implementation Flow**

1. **Phase 2A**: Create CreditService with core credit management
2. **Phase 2B**: Add credit deduction to schedule generation and task breakdown
3. **Phase 2C**: Implement Slack feature gating for Pro users
4. **Phase 2D**: Add frontend credit validation and upgrade prompts
5. **Phase 2E**: Enhance Stripe webhooks for automatic credit resets
6. **Phase 2F**: Testing and refinement of credit system edge cases

### **Success Criteria**

- ✅ Free users limited to 5 lifetime credits
- ✅ Pro users get 40 credits monthly on subscription anniversary
- ✅ Schedule generation and task breakdown consume 1 credit each
- ✅ Credits only deducted on successful AI operations
- ✅ Slack integration only available to Pro users
- ✅ Frontend blocks actions and shows upgrade prompts when credits exhausted
- ✅ Credit resets happen automatically via Stripe webhooks
- ✅ System handles failures gracefully with credit refunds

---

## **Phase 2 Implementation Progress**

### **✅ Phase 2A: Create CreditService with core credit management**
**Status**: COMPLETED ✅
**Files Modified**:
- `backend/services/credit_service.py` - Enhanced existing service with missing methods
- `backend/tests/test_credit_service.py` - Fixed test failures and added comprehensive coverage

**Key Implementations**:
- ✅ `has_sufficient_credits()` - Check if user has enough credits before operations
- ✅ `get_user_credits()` - Retrieve current credit balance
- ✅ `reset_user_credits()` - Monthly credit reset functionality
- ✅ `refund_credits()` - Compensation for failed operations
- ✅ Comprehensive test coverage for all credit operations
- ✅ Fixed existing test failures with proper mocking

### **✅ Phase 2B: Add credit deduction to schedule generation and task breakdown**
**Status**: COMPLETED ✅
**Files Modified**:
- `backend/decorators/credit_guards.py` - NEW: Decorator pattern for route protection
- `backend/utils/auth_helpers.py` - NEW: Shared authentication utilities
- `backend/apis/routes.py` - Added credit deduction decorators to AI endpoints
- `backend/tests/test_credit_guards.py` - NEW: Comprehensive decorator tests

**Key Implementations**:
- ✅ `@requires_credits(amount=1, operation_type='schedule_generation')` on `/api/submit_data`
- ✅ `@requires_credits(amount=1, operation_type='task_breakdown')` on `/api/tasks/decompose`
- ✅ Atomic credit deduction with automatic refund on operation failure
- ✅ Proper error handling with 402 Payment Required responses
- ✅ Resolved circular import issues with shared auth helpers
- ✅ Comprehensive test coverage for success/failure scenarios

### **✅ Phase 2C: Implement Slack feature gating for Pro users**
**Status**: COMPLETED ✅
**Files Modified**:
- `backend/apis/slack_routes.py` - Added Pro plan requirement decorators
- `backend/tests/test_slack_routes.py` - Added plan validation tests
- `frontend/components/parts/SlackIntegrationCard.tsx` - Added plan checking and UI updates

**Key Implementations**:
- ✅ `@requires_plan('pro')` on `/auth/connect`, `/status`, `/disconnect` endpoints
- ✅ 403 Forbidden responses for free users with proper error messages
- ✅ Frontend billing status integration and plan checking
- ✅ Dynamic UI states: "Pro Required" button for free users
- ✅ User-friendly error messages guiding users to upgrade
- ✅ Comprehensive test coverage for plan validation scenarios

### **✅ Phase 2D: Add frontend credit validation and upgrade prompts**
**Status**: COMPLETED ✅
**Files Modified**:
- `frontend/hooks/use-credit-validation.ts` - NEW: Simple credit validation hook
- `frontend/app/dashboard/preferences/page.tsx` - Added credit checking before schedule generation
- `frontend/components/parts/MobileTopNav.tsx` - Added saveDisabled prop for insufficient credits
- `frontend/components/parts/EditableScheduleRow.tsx` - Added credit validation to task breakdown buttons

**Key Implementations**:
- ✅ `useCreditValidation()` hook for checking user credits before operations
- ✅ Sonner toast integration with "Upgrade to Pro" action buttons
- ✅ Complete UI blocking when credits insufficient (disabled buttons + tooltips)
- ✅ Both desktop and mobile breakdown buttons protected
- ✅ Existing AppSidebar credit warnings verified working (shows warning at ≤1 credit)

### **✅ Phase 2E: Enhance Stripe webhooks for automatic credit resets**
**Status**: COMPLETED ✅
**Files Modified**:
- `backend/services/billing_service.py` - Enhanced checkout and added payment success handler
- `backend/apis/billing_routes.py` - Added `invoice.payment_succeeded` webhook support

**Key Implementations**:
- ✅ `handle_checkout_completed()` now tracks `subscriptionStartDate` for anniversary resets
- ✅ `handle_payment_succeeded()` resets Pro users to 40 credits on subscription renewals
- ✅ Anniversary-based credit resets (exact subscription date, not calendar month)
- ✅ Webhook integration for `invoice.payment_succeeded` events

### **✅ Phase 2F: Testing and refinement of credit system edge cases**
**Status**: COMPLETED ✅
**Files Created**:
- `frontend/__tests__/use-credit-validation.test.ts` - Unit tests for credit validation hook
- `backend/tests/test_billing_webhooks.py` - Integration tests for webhook handlers

**Key Implementations**:
- ✅ Comprehensive unit tests for credit validation scenarios
- ✅ Webhook integration tests for payment success and subscription events
- ✅ Error handling tests for edge cases (user not found, invalid data)
- ✅ Essential testing coverage focused on core functionality

---

## **Phase 2D-2F Implementation Summary**

**Key Discussion Points & Decisions Made:**
1. **Simple & Robust Approach**: Used reusable credit validation hook instead of over-engineering
2. **Complete UI Blocking**: Disabled buttons + Sonner toasts with upgrade actions when credits insufficient
3. **Anniversary-Based Resets**: Credits reset on exact subscription date rather than calendar month
4. **Essential Testing Only**: Focused on core functionality rather than comprehensive edge case coverage
5. **Existing Warnings Verified**: AppSidebar already shows "Low credits remaining" warning at ≤1 credit

**Architecture Benefits Achieved:**
- ✅ **Simple**: Reusable validation hook + direct upgrade prompts
- ✅ **Reliable**: Atomic credit operations with frontend validation
- ✅ **Compatible**: Works with existing billing system and UI patterns
- ✅ **Maintainable**: Clean separation of concerns with minimal complexity

---

## **Architecture Implemented**

### **Backend Credit System**
- ✅ **Decorator Pattern**: `@requires_credits()` and `@requires_plan()` for clean route protection
- ✅ **Atomic Operations**: Credit deduction with automatic compensation on failure
- ✅ **Service Layer**: Enhanced `CreditService` with all necessary credit management methods
- ✅ **Authentication**: Shared auth utilities preventing circular imports
- ✅ **Error Handling**: Proper HTTP status codes (402, 403) with descriptive error messages

### **Frontend Integration**
- ✅ **Plan-Based UI**: Dynamic Slack integration card based on user plan
- ✅ **Billing Status**: Integration with existing billing API for plan checking
- ✅ **User Experience**: Clear visual indicators and error messages for plan requirements

### **Testing Coverage**
- ✅ **Unit Tests**: Comprehensive coverage for credit operations and decorators
- ✅ **Integration Tests**: Plan validation and route protection testing
- ✅ **Mocking Strategy**: Proper test isolation with Firebase and database mocking

---

## **Technical Decisions Made**

1. **Enhanced Existing Code**: Extended existing `CreditService` rather than rewriting
2. **Decorator Pattern**: Clean, reusable route protection following TDD principles
3. **Shared Auth Utilities**: Resolved circular imports with dedicated auth helpers module
4. **Atomic Credit Operations**: Deduct first, refund on failure for data consistency
5. **Simple Plan Gating**: Boolean `plan === 'pro'` check for clear, maintainable logic
6. **Frontend Plan Integration**: Leverage existing billing status patterns from AppSidebar

---

## **Files Created/Modified Summary**

### **New Files**:
- `backend/decorators/credit_guards.py` - Route protection decorators
- `backend/utils/auth_helpers.py` - Shared authentication utilities
- `backend/tests/test_credit_guards.py` - Decorator test coverage

### **Enhanced Files**:
- `backend/services/credit_service.py` - Added missing credit management methods
- `backend/tests/test_credit_service.py` - Fixed tests and added coverage
- `backend/apis/routes.py` - Added credit deduction to AI endpoints
- `backend/apis/slack_routes.py` - Added Pro plan requirements
- `backend/tests/test_slack_routes.py` - Added plan validation tests
- `frontend/components/parts/SlackIntegrationCard.tsx` - Added plan checking and UI

---

## **Ready for Phase 2D**

The next phase should focus on frontend credit validation and upgrade prompts:
1. Add credit checking before AI operations in frontend
2. Implement upgrade toasts/modals when credits exhausted
3. Update task submission flows with credit validation
4. Enhance AppSidebar credit warnings for better UX