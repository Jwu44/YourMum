"""
Test suite for credit service functionality.
Tests credit deduction, balance checking, and credit management.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timezone
from backend.services.credit_service import CreditService, InsufficientCreditsError


class TestCreditService:
    """Test cases for CreditService class."""

    @pytest.fixture
    def credit_service(self):
        """Create CreditService instance for testing."""
        return CreditService()

    @pytest.fixture
    def free_user(self):
        """Sample free user data."""
        return {
            'googleId': 'free_user_123',
            'email': 'free@example.com',
            'plan': 'free',
            'creditsThisMonth': 3,
            'lifetimeFreeUsed': 2
        }

    @pytest.fixture
    def pro_user(self):
        """Sample pro user data."""
        return {
            'googleId': 'pro_user_123',
            'email': 'pro@example.com',
            'plan': 'pro',
            'planInterval': 'month',
            'creditsThisMonth': 25,
            'lifetimeFreeUsed': 5
        }

    @pytest.fixture
    def exhausted_free_user(self):
        """Sample free user with no credits."""
        return {
            'googleId': 'exhausted_user_123',
            'email': 'exhausted@example.com',
            'plan': 'free',
            'creditsThisMonth': 0,
            'lifetimeFreeUsed': 5
        }

    def test_check_credits_free_user_sufficient(self, credit_service, free_user):
        """Test credit check for free user with sufficient credits."""
        # Act
        result = credit_service.check_credits(free_user, credits_needed=1)

        # Assert
        assert result['has_credits'] is True
        assert result['available_credits'] == 3
        assert result['credits_needed'] == 1

    def test_check_credits_free_user_insufficient(self, credit_service, exhausted_free_user):
        """Test credit check for free user with insufficient credits."""
        # Act
        result = credit_service.check_credits(exhausted_free_user, credits_needed=1)

        # Assert
        assert result['has_credits'] is False
        assert result['available_credits'] == 0
        assert result['credits_needed'] == 1

    def test_check_credits_pro_user_sufficient(self, credit_service, pro_user):
        """Test credit check for pro user with sufficient credits."""
        # Act
        result = credit_service.check_credits(pro_user, credits_needed=5)

        # Assert
        assert result['has_credits'] is True
        assert result['available_credits'] == 25
        assert result['credits_needed'] == 5

    def test_deduct_credits_free_user_success(self, credit_service, free_user):
        """Test successful credit deduction for free user."""
        # Arrange
        with patch('backend.services.credit_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.update_one.return_value = Mock(modified_count=1)

            # Act
            result = credit_service.deduct_credits(
                user_id='free_user_123',
                credits_to_deduct=1,
                operation_type='schedule_generation'
            )

            # Assert
            assert result['success'] is True
            assert result['new_balance'] == 2
            assert result['lifetime_free_used'] == 3
            mock_collection.update_one.assert_called_once()

    def test_deduct_credits_pro_user_success(self, credit_service, pro_user):
        """Test successful credit deduction for pro user."""
        # Arrange
        with patch('backend.services.credit_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.update_one.return_value = Mock(modified_count=1)

            # Act
            result = credit_service.deduct_credits(
                user_id='pro_user_123',
                credits_to_deduct=2,
                operation_type='task_breakdown'
            )

            # Assert
            assert result['success'] is True
            assert result['new_balance'] == 23
            # Pro users don't increment lifetime free used
            assert 'lifetime_free_used' not in result
            mock_collection.update_one.assert_called_once()

    def test_deduct_credits_insufficient_balance(self, credit_service):
        """Test credit deduction with insufficient balance."""
        # Arrange
        with patch('backend.services.credit_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.find_one.return_value = {
                'googleId': 'exhausted_user_123',
                'plan': 'free',
                'creditsThisMonth': 0,
                'lifetimeFreeUsed': 5
            }

            # Act & Assert
            with pytest.raises(InsufficientCreditsError) as exc_info:
                credit_service.deduct_credits(
                    user_id='exhausted_user_123',
                    credits_to_deduct=1,
                    operation_type='schedule_generation'
                )

            assert exc_info.value.available_credits == 0
            assert exc_info.value.required_credits == 1

    def test_deduct_credits_user_not_found(self, credit_service):
        """Test credit deduction when user not found."""
        # Arrange
        with patch('backend.services.credit_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.find_one.return_value = None

            # Act
            result = credit_service.deduct_credits(
                user_id='nonexistent_user',
                credits_to_deduct=1,
                operation_type='schedule_generation'
            )

            # Assert
            assert result['success'] is False
            assert 'error' in result
            assert 'User not found' in result['error']

    def test_reset_pro_credits_success(self, credit_service):
        """Test successful pro user credit reset."""
        # Arrange
        with patch('backend.services.credit_service.get_database') as mock_db:
            mock_collection = Mock()
            mock_db.return_value = {'users': mock_collection}
            mock_collection.update_one.return_value = Mock(modified_count=1)

            next_reset = datetime.now(timezone.utc).replace(day=1).isoformat()

            # Act
            result = credit_service.reset_pro_credits(
                user_id='pro_user_123',
                next_reset_date=next_reset
            )

            # Assert
            assert result['success'] is True
            assert result['new_balance'] == 40
            mock_collection.update_one.assert_called_once()

    def test_get_credit_limits_free_plan(self, credit_service):
        """Test credit limits for free plan."""
        # Act
        limits = credit_service.get_credit_limits('free')

        # Assert
        assert limits['total_limit'] == 5
        assert limits['monthly_limit'] is None
        assert limits['reset_frequency'] is None

    def test_get_credit_limits_pro_plan(self, credit_service):
        """Test credit limits for pro plan."""
        # Act
        limits = credit_service.get_credit_limits('pro')

        # Assert
        assert limits['total_limit'] is None
        assert limits['monthly_limit'] == 40
        assert limits['reset_frequency'] == 'monthly'

    def test_calculate_credits_for_operation_schedule_generation(self, credit_service):
        """Test credit calculation for schedule generation."""
        # Act
        credits = credit_service.calculate_credits_for_operation('schedule_generation')

        # Assert
        assert credits == 1

    def test_calculate_credits_for_operation_task_breakdown(self, credit_service):
        """Test credit calculation for task breakdown."""
        # Act
        credits = credit_service.calculate_credits_for_operation('task_breakdown')

        # Assert
        assert credits == 1

    def test_calculate_credits_for_operation_categorization(self, credit_service):
        """Test credit calculation for categorization (free)."""
        # Act
        credits = credit_service.calculate_credits_for_operation('categorization')

        # Assert
        assert credits == 0

    def test_calculate_credits_for_operation_unknown(self, credit_service):
        """Test credit calculation for unknown operation."""
        # Act
        credits = credit_service.calculate_credits_for_operation('unknown_operation')

        # Assert
        assert credits == 0

    def test_get_user_credit_status_free_user(self, credit_service, free_user):
        """Test getting credit status for free user."""
        # Act
        status = credit_service.get_user_credit_status(free_user)

        # Assert
        assert status['plan'] == 'free'
        assert status['credits_available'] == 3
        assert status['credits_limit'] == 5
        assert status['lifetime_free_used'] == 2
        assert status['plan_interval'] is None

    def test_get_user_credit_status_pro_user(self, credit_service, pro_user):
        """Test getting credit status for pro user."""
        # Act
        status = credit_service.get_user_credit_status(pro_user)

        # Assert
        assert status['plan'] == 'pro'
        assert status['credits_available'] == 25
        assert status['credits_limit'] == 40
        assert status['lifetime_free_used'] == 5
        assert status['plan_interval'] == 'month'