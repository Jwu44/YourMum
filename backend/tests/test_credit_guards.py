"""
Test suite for credit guard decorators.
Tests credit validation and plan-based feature gating following TDD principles.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from flask import Flask, jsonify

from backend.decorators.credit_guards import requires_credits, requires_plan
from backend.services.credit_service import InsufficientCreditsError


class TestCreditGuards:
    """Test cases for credit guard decorators."""

    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = Flask(__name__)
        app.config['TESTING'] = True

        # Set up test routes with decorators
        @app.route('/test/credits')
        @requires_credits(amount=1, operation_type='test_operation')
        def test_credits_endpoint():
            return jsonify({'success': True, 'result': 'operation_complete'})

        @app.route('/test/plan')
        @requires_plan('pro')
        def test_plan_endpoint():
            return jsonify({'success': True, 'feature': 'pro_only'})

        @app.route('/test/combined')
        @requires_plan('pro')
        @requires_credits(amount=2, operation_type='pro_operation')
        def test_combined_endpoint():
            return jsonify({'success': True, 'feature': 'pro_with_credits'})

        return app

    @pytest.fixture
    def mock_user_free(self):
        """Mock free user data."""
        return {
            'googleId': 'free_user_123',
            'email': 'free@example.com',
            'plan': 'free',
            'creditsThisMonth': 3
        }

    @pytest.fixture
    def mock_user_pro(self):
        """Mock pro user data."""
        return {
            'googleId': 'pro_user_123',
            'email': 'pro@example.com',
            'plan': 'pro',
            'creditsThisMonth': 25
        }

    def test_requires_credits_sufficient_credits_success(self, app, mock_user_free):
        """Test requires_credits decorator with sufficient credits."""
        with app.test_request_context():
            # Mock successful scenario
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_free), \
                 patch('backend.decorators.credit_guards.CreditService') as mock_service_class:

                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.has_sufficient_credits.return_value = True
                mock_service.deduct_credits.return_value = {'success': True}

                @requires_credits(amount=1, operation_type='test_operation')
                def test_endpoint():
                    return jsonify({'success': True, 'result': 'operation_complete'})

                # Call the decorated function
                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                # Verify successful execution
                assert response_data['success'] is True
                assert response_data['result'] == 'operation_complete'

                # Verify credit service calls
                mock_service.has_sufficient_credits.assert_called_once_with('free_user_123', 1)
                mock_service.deduct_credits.assert_called_once_with(
                    user_id='free_user_123',
                    credits_to_deduct=1,
                    operation_type='test_operation'
                )

    def test_requires_credits_insufficient_credits(self, app, mock_user_free):
        """Test requires_credits decorator with insufficient credits."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_free), \
                 patch('backend.decorators.credit_guards.CreditService') as mock_service_class:

                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.has_sufficient_credits.return_value = False
                mock_service.get_user_credits.return_value = 2

                @requires_credits(amount=3, operation_type='test_operation')
                def test_endpoint():
                    return jsonify({'success': True})

                response, status_code = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                # Verify insufficient credits response
                assert status_code == 402
                assert response_data['success'] is False
                assert response_data['error'] == 'Insufficient credits'
                assert response_data['required'] == 3
                assert response_data['available'] == 2
                assert response_data['upgrade_required'] is True

                # Verify no deduction attempted
                mock_service.deduct_credits.assert_not_called()

    def test_requires_credits_deduction_exception(self, app, mock_user_free):
        """Test requires_credits decorator when deduction raises InsufficientCreditsError."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_free), \
                 patch('backend.decorators.credit_guards.CreditService') as mock_service_class:

                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.has_sufficient_credits.return_value = True
                mock_service.deduct_credits.side_effect = InsufficientCreditsError(2, 3)

                @requires_credits(amount=3, operation_type='test_operation')
                def test_endpoint():
                    return jsonify({'success': True})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                # Verify exception handling
                assert response.status_code == 402
                assert response_data['success'] is False
                assert response_data['error'] == 'Insufficient credits'
                assert response_data['required'] == 3
                assert response_data['available'] == 2

    def test_requires_credits_operation_failure_refund(self, app, mock_user_free):
        """Test requires_credits decorator refunds credits on operation failure."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_free), \
                 patch('backend.decorators.credit_guards.CreditService') as mock_service_class:

                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.has_sufficient_credits.return_value = True
                mock_service.deduct_credits.return_value = {'success': True}

                @requires_credits(amount=1, operation_type='test_operation')
                def test_endpoint():
                    # Simulate operation failure
                    raise Exception("Operation failed")

                # Verify exception is raised and credits are refunded
                with pytest.raises(Exception, match="Operation failed"):
                    test_endpoint()

                # Verify refund was called
                mock_service.refund_credits.assert_called_once_with(
                    user_id='free_user_123',
                    amount=1,
                    reason='operation_exception_test_operation'
                )

    def test_requires_credits_no_authentication(self, app):
        """Test requires_credits decorator with no authentication."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=None):

                @requires_credits(amount=1, operation_type='test_operation')
                def test_endpoint():
                    return jsonify({'success': True})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                assert response.status_code == 401
                assert response_data['success'] is False
                assert response_data['error'] == 'Authentication required'

    def test_requires_plan_pro_user_success(self, app, mock_user_pro):
        """Test requires_plan decorator with Pro user accessing Pro feature."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_pro):

                @requires_plan('pro')
                def test_endpoint():
                    return jsonify({'success': True, 'feature': 'pro_only'})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                assert response_data['success'] is True
                assert response_data['feature'] == 'pro_only'

    def test_requires_plan_free_user_blocked(self, app, mock_user_free):
        """Test requires_plan decorator blocks free user from Pro feature."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_free):

                @requires_plan('pro')
                def test_endpoint():
                    return jsonify({'success': True})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                assert response.status_code == 403
                assert response_data['success'] is False
                assert response_data['error'] == 'Feature requires Pro plan'
                assert response_data['current_plan'] == 'free'
                assert response_data['required_plan'] == 'pro'
                assert response_data['upgrade_required'] is True

    def test_requires_plan_no_authentication(self, app):
        """Test requires_plan decorator with no authentication."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=None):

                @requires_plan('pro')
                def test_endpoint():
                    return jsonify({'success': True})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                assert response.status_code == 401
                assert response_data['success'] is False
                assert response_data['error'] == 'Authentication required'

    def test_combined_decorators_success(self, app, mock_user_pro):
        """Test combination of requires_plan and requires_credits decorators."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_pro), \
                 patch('backend.decorators.credit_guards.CreditService') as mock_service_class:

                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.has_sufficient_credits.return_value = True
                mock_service.deduct_credits.return_value = {'success': True}

                @requires_plan('pro')
                @requires_credits(amount=2, operation_type='pro_operation')
                def test_endpoint():
                    return jsonify({'success': True, 'feature': 'pro_with_credits'})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                assert response_data['success'] is True
                assert response_data['feature'] == 'pro_with_credits'

    def test_combined_decorators_plan_blocked(self, app, mock_user_free):
        """Test combination where plan check blocks before credit check."""
        with app.test_request_context():
            with patch('backend.decorators.credit_guards.get_user_from_token', return_value=mock_user_free):

                @requires_plan('pro')
                @requires_credits(amount=1, operation_type='pro_operation')
                def test_endpoint():
                    return jsonify({'success': True})

                response = test_endpoint()
                response_data = json.loads(response.get_data(as_text=True))

                # Plan check should block before credit check
                assert response.status_code == 403
                assert response_data['error'] == 'Feature requires Pro plan'


if __name__ == '__main__':
    pytest.main([__file__])