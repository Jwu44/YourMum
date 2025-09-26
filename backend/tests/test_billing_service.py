"""
Test suite for billing service functionality.
Tests Stripe integration, subscription management, and billing operations.
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from backend.services.billing_service import BillingService
from backend.db_config import get_database


class TestBillingService:
    """Test cases for BillingService class."""

    @pytest.fixture
    def mock_stripe(self):
        """Mock Stripe client for testing."""
        with patch('backend.services.billing_service.stripe') as mock_stripe:
            yield mock_stripe

    @pytest.fixture
    def billing_service(self, mock_stripe):
        """Create BillingService instance with mocked Stripe."""
        return BillingService()

    @pytest.fixture
    def sample_user(self):
        """Sample user data for testing."""
        return {
            'googleId': 'test_user_123',
            'email': 'test@example.com',
            'displayName': 'Test User',
            'plan': 'free',
            'creditsThisMonth': 5,
            'lifetimeFreeUsed': 0
        }

    def test_create_customer_success(self, billing_service, mock_stripe, sample_user):
        """Test successful customer creation in Stripe."""
        # Arrange
        mock_customer = Mock()
        mock_customer.id = 'cus_test123'
        mock_stripe.Customer.create.return_value = mock_customer

        # Act
        result = billing_service.create_customer(sample_user)

        # Assert
        assert result['success'] is True
        assert result['customer_id'] == 'cus_test123'
        mock_stripe.Customer.create.assert_called_once_with(
            email=sample_user['email'],
            name=sample_user['displayName'],
            metadata={'googleId': sample_user['googleId']}
        )

    def test_create_customer_failure(self, billing_service, mock_stripe, sample_user):
        """Test customer creation failure handling."""
        # Arrange
        mock_stripe.Customer.create.side_effect = Exception("Stripe error")

        # Act
        result = billing_service.create_customer(sample_user)

        # Assert
        assert result['success'] is False
        assert 'error' in result
        assert 'Stripe error' in result['error']

    def test_create_checkout_session_monthly(self, billing_service, mock_stripe):
        """Test checkout session creation for monthly plan."""
        # Arrange
        mock_session = Mock()
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_stripe.checkout.Session.create.return_value = mock_session

        # Act
        result = billing_service.create_checkout_session(
            customer_id='cus_test123',
            price_id='price_monthly',
            success_url='https://app.com/success',
            cancel_url='https://app.com/cancel'
        )

        # Assert
        assert result['success'] is True
        assert result['checkout_url'] == 'https://checkout.stripe.com/test'
        mock_stripe.checkout.Session.create.assert_called_once()

    def test_create_checkout_session_failure(self, billing_service, mock_stripe):
        """Test checkout session creation failure."""
        # Arrange
        mock_stripe.checkout.Session.create.side_effect = Exception("Session error")

        # Act
        result = billing_service.create_checkout_session(
            customer_id='cus_test123',
            price_id='price_monthly'
        )

        # Assert
        assert result['success'] is False
        assert 'error' in result

    def test_create_customer_portal_session(self, billing_service, mock_stripe):
        """Test customer portal session creation."""
        # Arrange
        mock_session = Mock()
        mock_session.url = 'https://billing.stripe.com/test'
        mock_stripe.billing_portal.Session.create.return_value = mock_session

        # Act
        result = billing_service.create_customer_portal_session(
            customer_id='cus_test123',
            return_url='https://app.com/dashboard'
        )

        # Assert
        assert result['success'] is True
        assert result['portal_url'] == 'https://billing.stripe.com/test'

    def test_handle_checkout_completed(self, billing_service, mock_stripe, sample_user):
        """Test successful checkout completion webhook handling."""
        # Arrange
        checkout_session_data = {
            'id': 'cs_test123',
            'customer': 'cus_test123',
            'subscription': 'sub_test123',
            'metadata': {'googleId': 'test_user_123'}
        }

        mock_subscription = Mock()
        mock_subscription.current_period_end = int((datetime.now() + timedelta(days=30)).timestamp())
        mock_subscription.items.data = [Mock()]
        mock_subscription.items.data[0].price.recurring.interval = 'month'
        mock_stripe.Subscription.retrieve.return_value = mock_subscription

        with patch('backend.services.billing_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.find_one.return_value = sample_user
            mock_collection.update_one.return_value = Mock()

            # Act
            result = billing_service.handle_checkout_completed(checkout_session_data)

            # Assert
            assert result['success'] is True
            mock_collection.update_one.assert_called_once()

    def test_handle_subscription_deleted(self, billing_service, sample_user):
        """Test subscription deletion handling."""
        # Arrange
        subscription_data = {
            'id': 'sub_test123',
            'customer': 'cus_test123'
        }

        with patch('backend.services.billing_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.find_one.return_value = {
                **sample_user,
                'stripeCustomerId': 'cus_test123',
                'plan': 'pro'
            }
            mock_collection.update_one.return_value = Mock()

            # Act
            result = billing_service.handle_subscription_deleted(subscription_data)

            # Assert
            assert result['success'] is True
            mock_collection.update_one.assert_called_once()

    def test_calculate_free_credits_new_user(self, billing_service):
        """Test free credits calculation for new user."""
        # Act
        credits = billing_service.calculate_free_credits(lifetime_used=0)

        # Assert
        assert credits == 5

    def test_calculate_free_credits_partially_used(self, billing_service):
        """Test free credits calculation for partially used."""
        # Act
        credits = billing_service.calculate_free_credits(lifetime_used=3)

        # Assert
        assert credits == 2

    def test_calculate_free_credits_exhausted(self, billing_service):
        """Test free credits calculation when exhausted."""
        # Act
        credits = billing_service.calculate_free_credits(lifetime_used=5)

        # Assert
        assert credits == 0

    def test_calculate_free_credits_over_limit(self, billing_service):
        """Test free credits calculation when over limit."""
        # Act
        credits = billing_service.calculate_free_credits(lifetime_used=10)

        # Assert
        assert credits == 0

    @patch.dict(os.environ, {'STRIPE_SECRET_KEY': 'sk_test_123'})
    def test_initialization_with_env_var(self):
        """Test service initialization with environment variable."""
        with patch('backend.services.billing_service.stripe') as mock_stripe:
            billing_service = BillingService()
            mock_stripe.api_key = 'sk_test_123'
            assert billing_service is not None

    def test_initialization_without_env_var(self):
        """Test service initialization without environment variable."""
        with patch.dict(os.environ, {}, clear=True):
            with patch('backend.services.billing_service.stripe') as mock_stripe:
                with pytest.raises(ValueError, match="STRIPE_SECRET_KEY environment variable not set"):
                    BillingService()