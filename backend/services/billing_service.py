"""
Billing service for Stripe integration and subscription management.
Handles customer creation, checkout sessions, and webhook processing.
"""

import os
import stripe
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from backend.db_config import get_database


class BillingService:
    """Service for handling Stripe billing operations."""

    def __init__(self):
        """Initialize Stripe client with API key."""
        stripe_key = os.environ.get('STRIPE_SECRET_KEY')
        if not stripe_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable not set")

        stripe.api_key = stripe_key

    def create_customer(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new Stripe customer.

        Args:
            user_data: User information containing email, displayName, googleId

        Returns:
            Dict containing success status and customer_id or error
        """
        try:
            customer = stripe.Customer.create(
                email=user_data['email'],
                name=user_data.get('displayName', ''),
                metadata={
                    'googleId': user_data['googleId']
                }
            )

            return {
                'success': True,
                'customer_id': customer.id
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to create customer: {str(e)}"
            }


    def create_customer_portal_session(
        self,
        customer_id: str,
        return_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe customer portal session.

        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after portal session

        Returns:
            Dict containing success status and portal_url or error
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url or 'https://yourmum.app/dashboard'
            )

            return {
                'success': True,
                'portal_url': session.url
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to create portal session: {str(e)}"
            }

    def handle_checkout_completed(self, checkout_session: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle successful checkout completion webhook.

        Args:
            checkout_session: Stripe checkout session data

        Returns:
            Dict containing success status and result or error
        """
        try:
            # Get subscription details
            subscription_id = checkout_session.get('subscription')
            customer_id = checkout_session.get('customer')
            google_id = checkout_session.get('metadata', {}).get('googleId')

            if not subscription_id or not customer_id:
                return {
                    'success': False,
                    'error': 'Missing subscription or customer ID'
                }

            # Retrieve subscription from Stripe
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Calculate next credit reset date (monthly Pro plan)
            next_reset = datetime.fromtimestamp(
                subscription.current_period_end,
                tz=timezone.utc
            )

            # Update user in database
            db = get_database()
            users_collection = db['users']

            # Find user by email from checkout session
            customer_email = checkout_session.get('customer_details', {}).get('email')
            if not customer_email:
                # Fallback: get customer email from Stripe
                customer = stripe.Customer.retrieve(customer_id)
                customer_email = customer.email

            if not customer_email:
                return {
                    'success': False,
                    'error': 'No customer email found for user identification'
                }

            # Find user by email
            user = users_collection.find_one({'email': customer_email})
            if not user:
                return {
                    'success': False,
                    'error': f'User not found with email: {customer_email}'
                }

            print(f"DEBUG: Found user for email {customer_email}: {user.get('googleId')}")
            print(f"DEBUG: Current user plan: plan={user.get('plan')}")

            # Track original subscription date for anniversary-based resets
            subscription_start_date = datetime.fromtimestamp(
                subscription.current_period_start,
                tz=timezone.utc
            )

            # Update user to Pro plan with 40 credits (monthly only)
            update_data = {
                'stripeCustomerId': customer_id,
                'subscriptionId': subscription_id,
                'plan': 'pro',
                'planInterval': 'month',
                'creditsThisMonth': 40,
                'nextCreditResetAt': next_reset,
                'subscriptionStartDate': subscription_start_date  # Track original subscription date
            }

            users_collection.update_one(
                {'googleId': user['googleId']},
                {'$set': update_data}
            )

            return {
                'success': True,
                'user_id': user['googleId'],
                'user_email': customer_email,
                'plan': 'pro',
                'credits': 40
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to handle checkout completion: {str(e)}"
            }

    def handle_subscription_updated(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle subscription update webhook.

        Args:
            subscription: Stripe subscription data

        Returns:
            Dict containing success status and result or error
        """
        try:
            customer_id = subscription.get('customer')
            subscription_id = subscription.get('id')
            status = subscription.get('status')

            # Update user subscription status
            db = get_database()
            users_collection = db['users']

            user = users_collection.find_one({'stripeCustomerId': customer_id})
            if not user:
                return {
                    'success': False,
                    'error': 'User not found'
                }

            update_data = {'subscriptionId': subscription_id}

            # If subscription is inactive, downgrade to free
            if status in ['canceled', 'incomplete_expired', 'unpaid']:
                update_data.update({
                    'plan': 'free',
                    'planInterval': None,
                    'creditsThisMonth': self.calculate_free_credits(
                        user.get('lifetimeFreeUsed', 0)
                    ),
                    'nextCreditResetAt': None
                })

            users_collection.update_one(
                {'googleId': user['googleId']},
                {'$set': update_data}
            )

            return {
                'success': True,
                'user_id': user['googleId'],
                'status': status
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to handle subscription update: {str(e)}"
            }

    def handle_subscription_deleted(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle subscription deletion webhook.

        Args:
            subscription: Stripe subscription data

        Returns:
            Dict containing success status and result or error
        """
        try:
            customer_id = subscription.get('customer')

            # Downgrade user to free plan
            db = get_database()
            users_collection = db['users']

            user = users_collection.find_one({'stripeCustomerId': customer_id})
            if not user:
                return {
                    'success': False,
                    'error': 'User not found'
                }

            # Calculate remaining free credits
            free_credits = self.calculate_free_credits(
                user.get('lifetimeFreeUsed', 0)
            )

            update_data = {
                'plan': 'free',
                'planInterval': None,
                'subscriptionId': None,
                'creditsThisMonth': free_credits,
                'nextCreditResetAt': None
            }

            users_collection.update_one(
                {'googleId': user['googleId']},
                {'$set': update_data}
            )

            return {
                'success': True,
                'user_id': user['googleId'],
                'plan': 'free',
                'credits': free_credits
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to handle subscription deletion: {str(e)}"
            }

    def handle_payment_succeeded(self, invoice: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle successful payment webhook for subscription renewals.
        Resets credits to 40 on subscription anniversary date.

        Args:
            invoice: Stripe invoice data

        Returns:
            Dict containing success status and result or error
        """
        try:
            customer_id = invoice.get('customer')
            subscription_id = invoice.get('subscription')

            if not subscription_id:
                # Not a subscription payment, ignore
                return {
                    'success': True,
                    'message': 'Non-subscription payment, no action needed'
                }

            # Get user from database
            db = get_database()
            users_collection = db['users']

            user = users_collection.find_one({'stripeCustomerId': customer_id})
            if not user:
                return {
                    'success': False,
                    'error': 'User not found'
                }

            # Only reset credits for Pro users
            if user.get('plan') != 'pro':
                return {
                    'success': True,
                    'message': 'User not on Pro plan, no action needed'
                }

            # Retrieve subscription from Stripe to get period info
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Calculate next credit reset date (anniversary-based)
            next_reset = datetime.fromtimestamp(
                subscription.current_period_end,
                tz=timezone.utc
            )

            # Reset credits to 40 for Pro users on successful payment
            update_data = {
                'creditsThisMonth': 40,
                'nextCreditResetAt': next_reset
            }

            users_collection.update_one(
                {'googleId': user['googleId']},
                {'$set': update_data}
            )

            return {
                'success': True,
                'user_id': user['googleId'],
                'credits_reset': 40,
                'next_reset': next_reset.isoformat()
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to handle payment success: {str(e)}"
            }

    def handle_payment_failed(self, invoice: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle payment failure webhook.

        Args:
            invoice: Stripe invoice data

        Returns:
            Dict containing success status and result or error
        """
        try:
            customer_id = invoice.get('customer')

            # Downgrade user to free plan on payment failure
            db = get_database()
            users_collection = db['users']

            user = users_collection.find_one({'stripeCustomerId': customer_id})
            if not user:
                return {
                    'success': False,
                    'error': 'User not found'
                }

            # Calculate remaining free credits
            free_credits = self.calculate_free_credits(
                user.get('lifetimeFreeUsed', 0)
            )

            update_data = {
                'plan': 'free',
                'planInterval': None,
                'creditsThisMonth': free_credits,
                'nextCreditResetAt': None
            }

            users_collection.update_one(
                {'googleId': user['googleId']},
                {'$set': update_data}
            )

            return {
                'success': True,
                'user_id': user['googleId'],
                'plan': 'free',
                'credits': free_credits
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to handle payment failure: {str(e)}"
            }

    @staticmethod
    def calculate_free_credits(lifetime_used: int) -> int:
        """
        Calculate remaining free credits for user.

        Args:
            lifetime_used: Total free credits used across lifetime

        Returns:
            Number of remaining free credits (max 5)
        """
        FREE_CREDIT_LIMIT = 5
        return max(0, FREE_CREDIT_LIMIT - lifetime_used)