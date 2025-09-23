"""
Unit tests for billing service webhook handlers.

Tests the webhook handlers for Phase 2E implementation.
Focuses on essential credit reset functionality only.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timezone
from backend.services.billing_service import BillingService


class TestBillingWebhooks:
    """Test class for billing service webhook handlers."""

    def setup_method(self):
        """Set up test fixtures."""
        self.billing_service = BillingService()

    @patch('stripe.Subscription.retrieve')
    @patch('backend.services.billing_service.get_database')
    def test_payment_succeeded_resets_credits(self, mock_get_db, mock_stripe_retrieve):
        """Test that invoice.payment_succeeded resets credits for Pro users."""
        # Mock database
        mock_users_collection = Mock()
        mock_db = Mock()
        mock_db.__getitem__.return_value = mock_users_collection
        mock_get_db.return_value = mock_db

        # Mock user in database
        mock_user = {
            'googleId': 'test-user-123',
            'plan': 'pro',
            'creditsThisMonth': 5  # User has used some credits
        }
        mock_users_collection.find_one.return_value = mock_user

        # Mock Stripe subscription
        mock_subscription = Mock()
        mock_subscription.current_period_end = 1735689600  # Jan 1, 2025
        mock_stripe_retrieve.return_value = mock_subscription

        # Test invoice data
        invoice_data = {
            'customer': 'cus_test123',
            'subscription': 'sub_test123'
        }

        # Call the handler
        result = self.billing_service.handle_payment_succeeded(invoice_data)

        # Verify success
        assert result['success'] is True
        assert result['user_id'] == 'test-user-123'
        assert result['credits_reset'] == 40

        # Verify database update was called
        mock_users_collection.update_one.assert_called_once()
        update_call = mock_users_collection.update_one.call_args
        assert update_call[0][0] == {'googleId': 'test-user-123'}
        assert update_call[0][1]['$set']['creditsThisMonth'] == 40

    @patch('backend.services.billing_service.get_database')
    def test_payment_succeeded_ignores_non_subscription_payments(self, mock_get_db):
        """Test that non-subscription payments are ignored."""
        # Test invoice data without subscription
        invoice_data = {
            'customer': 'cus_test123'
            # No subscription field
        }

        # Call the handler
        result = self.billing_service.handle_payment_succeeded(invoice_data)

        # Verify it's ignored
        assert result['success'] is True
        assert result['message'] == 'Non-subscription payment, no action needed'

    @patch('backend.services.billing_service.get_database')
    def test_payment_succeeded_ignores_free_users(self, mock_get_db):
        """Test that free users don't get credit resets."""
        # Mock database
        mock_users_collection = Mock()
        mock_db = Mock()
        mock_db.__getitem__.return_value = mock_users_collection
        mock_get_db.return_value = mock_db

        # Mock free user in database
        mock_user = {
            'googleId': 'test-user-123',
            'plan': 'free',
            'creditsThisMonth': 2
        }
        mock_users_collection.find_one.return_value = mock_user

        # Test invoice data
        invoice_data = {
            'customer': 'cus_test123',
            'subscription': 'sub_test123'
        }

        # Call the handler
        result = self.billing_service.handle_payment_succeeded(invoice_data)

        # Verify free user is ignored
        assert result['success'] is True
        assert result['message'] == 'User not on Pro plan, no action needed'

    @patch('backend.services.billing_service.get_database')
    def test_checkout_completed_tracks_subscription_date(self, mock_get_db):
        """Test that checkout completion tracks the original subscription date."""
        # Mock database
        mock_users_collection = Mock()
        mock_db = Mock()
        mock_db.__getitem__.return_value = mock_users_collection
        mock_get_db.return_value = mock_db

        # Mock user in database
        mock_user = {
            'googleId': 'test-user-123',
            'email': 'test@example.com'
        }
        mock_users_collection.find_one.return_value = mock_user

        # Test checkout session data
        checkout_data = {
            'subscription': 'sub_test123',
            'customer': 'cus_test123',
            'customer_details': {
                'email': 'test@example.com'
            }
        }

        with patch('stripe.Subscription.retrieve') as mock_retrieve:
            # Mock subscription with period dates
            mock_subscription = Mock()
            mock_subscription.current_period_start = 1704067200  # Jan 1, 2024
            mock_subscription.current_period_end = 1735689600   # Jan 1, 2025
            mock_retrieve.return_value = mock_subscription

            # Call the handler
            result = self.billing_service.handle_checkout_completed(checkout_data)

        # Verify success
        assert result['success'] is True
        assert result['plan'] == 'pro'
        assert result['credits'] == 40

        # Verify database update includes subscription start date
        mock_users_collection.update_one.assert_called_once()
        update_call = mock_users_collection.update_one.call_args
        update_data = update_call[0][1]['$set']

        assert 'subscriptionStartDate' in update_data
        assert update_data['plan'] == 'pro'
        assert update_data['creditsThisMonth'] == 40

    @patch('backend.services.billing_service.get_database')
    def test_payment_succeeded_handles_user_not_found(self, mock_get_db):
        """Test error handling when user is not found."""
        # Mock database
        mock_users_collection = Mock()
        mock_db = Mock()
        mock_db.__getitem__.return_value = mock_users_collection
        mock_get_db.return_value = mock_db

        # Mock user not found
        mock_users_collection.find_one.return_value = None

        # Test invoice data
        invoice_data = {
            'customer': 'cus_test123',
            'subscription': 'sub_test123'
        }

        # Call the handler
        result = self.billing_service.handle_payment_succeeded(invoice_data)

        # Verify error handling
        assert result['success'] is False
        assert result['error'] == 'User not found'