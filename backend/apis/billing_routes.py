"""
Billing API routes for Stripe integration.
Handles checkout sessions, customer portal, and webhooks.
"""

import os
import json
import stripe
from flask import Blueprint, request, jsonify
from typing import Dict, Any

from backend.services.billing_service import BillingService
from backend.services.credit_service import CreditService
from backend.utils.auth import verify_firebase_token
from backend.db_config import get_database


billing_bp = Blueprint("billing", __name__, url_prefix="/api/billing")
billing_service = BillingService()
credit_service = CreditService()


def get_user_from_token() -> Dict[str, Any]:
    """
    Extract and verify user from Firebase token.

    Returns:
        User data from database

    Raises:
        Exception: If token is invalid or user not found
    """
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise Exception("Missing or invalid Authorization header")

    token = auth_header.split(' ')[1]
    firebase_user = verify_firebase_token(token)

    if not firebase_user or not firebase_user.get('uid'):
        raise Exception("Invalid Firebase token")

    # Get user from database
    db = get_database()
    users_collection = db['users']
    user = users_collection.find_one({'googleId': firebase_user['uid']})

    if not user:
        raise Exception("User not found in database")

    return user




@billing_bp.route("/portal", methods=["POST"])
def create_customer_portal_session():
    """
    Create Stripe customer portal session.

    Expected JSON body:
    {
        "returnUrl": "https://app.com/dashboard"
    }

    Returns:
        JSON response with portal URL or error
    """
    try:
        # Verify authentication
        user = get_user_from_token()

        # Check if user has Stripe customer ID
        stripe_customer_id = user.get('stripeCustomerId')
        if not stripe_customer_id:
            return jsonify({
                'success': False,
                'error': 'No billing account found. Please subscribe first.'
            }), 400

        # Get request data
        data = request.get_json() or {}
        return_url = data.get('returnUrl')

        # Create portal session
        portal_result = billing_service.create_customer_portal_session(
            customer_id=stripe_customer_id,
            return_url=return_url
        )

        if not portal_result['success']:
            return jsonify({
                'success': False,
                'error': portal_result['error']
            }), 500

        return jsonify({
            'success': True,
            'portalUrl': portal_result['portal_url']
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Failed to create portal session: {str(e)}"
        }), 500


@billing_bp.route("/status", methods=["GET"])
def get_billing_status():
    """
    Get user's billing and credit status.

    Returns:
        JSON response with billing status
    """
    try:
        # Verify authentication
        user = get_user_from_token()

        # Get credit status
        credit_status = credit_service.get_user_credit_status(user)

        return jsonify({
            'success': True,
            'status': credit_status
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Failed to get billing status: {str(e)}"
        }), 500


@billing_bp.route("/cancel-subscription", methods=["POST"])
def cancel_subscription():
    """
    Cancel user's subscription.

    Expected JSON body (optional):
    {
        "cancelImmediately": false  // Default: cancel at period end
    }

    Returns:
        JSON response with cancellation status
    """
    try:
        # Verify authentication
        user = get_user_from_token()

        # Check if user has an active subscription
        subscription_id = user.get('subscriptionId')
        if not subscription_id:
            return jsonify({
                'success': False,
                'error': 'No active subscription found'
            }), 400

        # Get request data
        data = request.get_json() or {}
        cancel_immediately = data.get('cancelImmediately', False)

        # Cancel subscription
        cancel_result = billing_service.cancel_subscription(
            subscription_id=subscription_id,
            cancel_immediately=cancel_immediately
        )

        if not cancel_result['success']:
            return jsonify({
                'success': False,
                'error': cancel_result['error']
            }), 500

        return jsonify({
            'success': True,
            'subscriptionId': cancel_result['subscription_id'],
            'status': cancel_result['status'],
            'cancelAtPeriodEnd': cancel_result['cancel_at_period_end'],
            'currentPeriodEnd': cancel_result['current_period_end']
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Failed to cancel subscription: {str(e)}"
        }), 500


@billing_bp.route("/webhook", methods=["POST"])
def handle_stripe_webhook():
    """
    Handle Stripe webhook events.

    Returns:
        JSON response confirming webhook receipt
    """
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        # Verify webhook signature
        webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        if not webhook_secret:
            return jsonify({
                'success': False,
                'error': 'Webhook secret not configured'
            }), 500

        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )

    except ValueError:
        # Invalid payload
        return jsonify({
            'success': False,
            'error': 'Invalid payload'
        }), 400
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return jsonify({
            'success': False,
            'error': 'Invalid signature'
        }), 400

    # Handle different event types
    event_type = event['type']
    event_data = event['data']['object']

    try:
        if event_type == 'checkout.session.completed':
            result = billing_service.handle_checkout_completed(event_data)
        elif event_type == 'customer.subscription.updated':
            result = billing_service.handle_subscription_updated(event_data)
        elif event_type == 'customer.subscription.deleted':
            result = billing_service.handle_subscription_deleted(event_data)
        elif event_type == 'invoice.payment_succeeded':
            result = billing_service.handle_payment_succeeded(event_data)
        elif event_type == 'invoice.payment_failed':
            result = billing_service.handle_payment_failed(event_data)
        else:
            # Unhandled event type
            return jsonify({
                'success': True,
                'message': f'Unhandled event type: {event_type}'
            })

        if not result['success']:
            print(f"Error handling webhook {event_type}: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'message': f'Successfully handled {event_type}'
        })

    except Exception as e:
        print(f"Error processing webhook {event_type}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to process webhook: {str(e)}"
        }), 500


# Global OPTIONS request handler for CORS
@billing_bp.route('/<path:path>', methods=['OPTIONS'])
@billing_bp.route('/', methods=['OPTIONS'])
def handle_options_requests(path=None):
    """
    Handle OPTIONS preflight requests for CORS.

    Args:
        path: Optional path parameter

    Returns:
        JSON response with 200 OK status
    """
    return jsonify({"status": "ok"})