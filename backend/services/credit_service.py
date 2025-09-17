"""
Credit service for managing user credits and deduction logic.
Handles credit checking, deduction, and limit management.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.db_config import get_database


class InsufficientCreditsError(Exception):
    """Exception raised when user has insufficient credits."""

    def __init__(self, available_credits: int, required_credits: int):
        self.available_credits = available_credits
        self.required_credits = required_credits
        super().__init__(
            f"Insufficient credits: {available_credits} available, {required_credits} required"
        )


class CreditService:
    """Service for handling credit operations."""

    # Credit costs for different operations
    OPERATION_COSTS = {
        'schedule_generation': 1,
        'task_breakdown': 1,
        'categorization': 0  # Free operation
    }

    # Plan limits
    FREE_CREDIT_LIMIT = 5
    PRO_MONTHLY_CREDITS = 40

    def check_credits(self, user: Dict[str, Any], credits_needed: int) -> Dict[str, Any]:
        """
        Check if user has sufficient credits for operation.

        Args:
            user: User document from database
            credits_needed: Number of credits required

        Returns:
            Dict with credit check results
        """
        available_credits = user.get('creditsThisMonth', 0)

        return {
            'has_credits': available_credits >= credits_needed,
            'available_credits': available_credits,
            'credits_needed': credits_needed,
            'plan': user.get('plan', 'free')
        }

    def deduct_credits(
        self,
        user_id: str,
        credits_to_deduct: int,
        operation_type: str
    ) -> Dict[str, Any]:
        """
        Deduct credits from user account.

        Args:
            user_id: User's Google ID
            credits_to_deduct: Number of credits to deduct
            operation_type: Type of operation (for logging)

        Returns:
            Dict containing success status and new balance or error

        Raises:
            InsufficientCreditsError: When user has insufficient credits
        """
        try:
            db = get_database()
            users_collection = db['users']

            # Find user
            user = users_collection.find_one({'googleId': user_id})
            if not user:
                return {
                    'success': False,
                    'error': 'User not found'
                }

            current_credits = user.get('creditsThisMonth', 0)
            plan = user.get('plan', 'free')

            # Check if user has sufficient credits
            if current_credits < credits_to_deduct:
                raise InsufficientCreditsError(current_credits, credits_to_deduct)

            # Calculate new balance
            new_balance = current_credits - credits_to_deduct

            # Prepare update data
            update_data = {
                'creditsThisMonth': new_balance
            }

            # For free users, increment lifetime usage
            if plan == 'free':
                lifetime_used = user.get('lifetimeFreeUsed', 0)
                update_data['lifetimeFreeUsed'] = lifetime_used + credits_to_deduct

            # Update user in database
            result = users_collection.update_one(
                {'googleId': user_id},
                {'$set': update_data}
            )

            if result.modified_count == 0:
                return {
                    'success': False,
                    'error': 'Failed to update user credits'
                }

            response = {
                'success': True,
                'new_balance': new_balance,
                'operation_type': operation_type
            }

            # Include lifetime usage for free users
            if plan == 'free':
                response['lifetime_free_used'] = update_data['lifetimeFreeUsed']

            return response

        except InsufficientCreditsError:
            raise
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to deduct credits: {str(e)}"
            }

    def reset_pro_credits(self, user_id: str, next_reset_date: str) -> Dict[str, Any]:
        """
        Reset credits for pro user (monthly billing cycle).

        Args:
            user_id: User's Google ID
            next_reset_date: ISO string for next reset date

        Returns:
            Dict containing success status and new balance or error
        """
        try:
            db = get_database()
            users_collection = db['users']

            # Reset to full pro credits
            update_data = {
                'creditsThisMonth': self.PRO_MONTHLY_CREDITS,
                'nextCreditResetAt': next_reset_date
            }

            result = users_collection.update_one(
                {'googleId': user_id},
                {'$set': update_data}
            )

            if result.modified_count == 0:
                return {
                    'success': False,
                    'error': 'Failed to reset user credits'
                }

            return {
                'success': True,
                'new_balance': self.PRO_MONTHLY_CREDITS
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to reset credits: {str(e)}"
            }

    def get_credit_limits(self, plan: str) -> Dict[str, Any]:
        """
        Get credit limits for a given plan.

        Args:
            plan: User's plan type ('free' or 'pro')

        Returns:
            Dict containing credit limit information
        """
        if plan == 'free':
            return {
                'total_limit': self.FREE_CREDIT_LIMIT,
                'monthly_limit': None,
                'reset_frequency': None
            }
        elif plan == 'pro':
            return {
                'total_limit': None,
                'monthly_limit': self.PRO_MONTHLY_CREDITS,
                'reset_frequency': 'monthly'
            }
        else:
            return {
                'total_limit': 0,
                'monthly_limit': 0,
                'reset_frequency': None
            }

    def calculate_credits_for_operation(self, operation_type: str) -> int:
        """
        Calculate credit cost for operation type.

        Args:
            operation_type: Type of operation

        Returns:
            Number of credits required
        """
        return self.OPERATION_COSTS.get(operation_type, 0)

    def get_user_credit_status(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get comprehensive credit status for user.

        Args:
            user: User document from database

        Returns:
            Dict containing credit status information
        """
        plan = user.get('plan', 'free')
        limits = self.get_credit_limits(plan)

        return {
            'plan': plan,
            'planInterval': user.get('planInterval'),
            'creditsThisMonth': user.get('creditsThisMonth', 0),
            'creditsLimit': limits.get('monthly_limit') or limits.get('total_limit'),
            'lifetimeFreeUsed': user.get('lifetimeFreeUsed', 0),
            'nextCreditResetAt': user.get('nextCreditResetAt'),
            'resetFrequency': limits.get('reset_frequency')
        }