"""
Credit guard decorators for route protection.
Implements decorator pattern for clean route protection following dev-guide.md principles.
"""

from functools import wraps
from flask import jsonify, request
from typing import Callable, Dict, Any

from backend.services.credit_service import CreditService, InsufficientCreditsError
from backend.utils.auth_helpers import extract_user_from_request


def requires_credits(amount: int, operation_type: str):
    """
    Decorator to validate and deduct credits before expensive operations.

    Implements atomic credit deduction with compensation on failure following
    the documented architecture in task43.md.

    Args:
        amount: Number of credits required
        operation_type: Type of operation for logging

    Returns:
        Decorator function
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Extract and verify user from request
                user, error_response = extract_user_from_request()
                if error_response:
                    return error_response

                user_id = user['googleId']
                credit_service = CreditService()

                # Check credits first (fail-fast validation)
                if not credit_service.has_sufficient_credits(user_id, amount):
                    available_credits = credit_service.get_user_credits(user_id)
                    return jsonify({
                        'success': False,
                        'error': 'Insufficient credits',
                        'required': amount,
                        'available': available_credits,
                        'upgrade_required': True
                    }), 402  # Payment Required

                # Deduct credits atomically before operation
                try:
                    deduction_result = credit_service.deduct_credits(
                        user_id=user_id,
                        credits_to_deduct=amount,
                        operation_type=operation_type
                    )

                    if not deduction_result.get('success'):
                        return jsonify({
                            'success': False,
                            'error': 'Credit deduction failed'
                        }), 500

                except InsufficientCreditsError as e:
                    return jsonify({
                        'success': False,
                        'error': 'Insufficient credits',
                        'required': e.required_credits,
                        'available': e.available_credits,
                        'upgrade_required': True
                    }), 402

                # Execute the expensive operation
                try:
                    result = f(*args, **kwargs)

                    # If operation returns a response with error status, refund credits
                    if hasattr(result, 'status_code') and result.status_code >= 400:
                        credit_service.refund_credits(
                            user_id=user_id,
                            amount=amount,
                            reason=f"operation_failed_{operation_type}"
                        )

                    return result

                except Exception as operation_error:
                    # Compensation: refund credits on operation failure
                    credit_service.refund_credits(
                        user_id=user_id,
                        amount=amount,
                        reason=f"operation_exception_{operation_type}"
                    )
                    raise operation_error

            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f"Credit validation failed: {str(e)}"
                }), 500

        return decorated_function
    return decorator


def requires_plan(required_plan: str):
    """
    Decorator to gate features by subscription plan.

    Args:
        required_plan: Plan required ('pro', 'enterprise', etc.)

    Returns:
        Decorator function
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Extract and verify user from request
                user, error_response = extract_user_from_request()
                if error_response:
                    return error_response

                user_plan = user.get('plan', 'free')

                # Simple boolean check as documented in requirements
                if required_plan == 'pro' and user_plan != 'pro':
                    return jsonify({
                        'success': False,
                        'error': 'Feature requires Pro plan',
                        'current_plan': user_plan,
                        'required_plan': required_plan,
                        'upgrade_required': True
                    }), 403  # Forbidden

                return f(*args, **kwargs)

            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f"Plan validation failed: {str(e)}"
                }), 500

        return decorated_function
    return decorator