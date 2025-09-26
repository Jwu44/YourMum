"""
Authentication helper functions to avoid circular imports.
Contains reusable authentication logic for decorators and routes.
"""

from flask import request, jsonify
from typing import Dict, Any, Optional, Tuple
from backend.utils.auth import verify_firebase_token
from backend.db_config import get_database


def extract_user_from_request() -> Tuple[Optional[Dict[str, Any]], Optional[Tuple]]:
    """
    Extract and verify user from Firebase token in request headers.

    Returns:
        Tuple of (user_data, error_response) where error_response is a tuple of (response, status_code)
    """
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None, (jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401)

        token = auth_header.split(' ')[1]

        # Verify Firebase token
        try:
            firebase_user = verify_firebase_token(token)
        except Exception as auth_error:
            return None, (jsonify({
                'success': False,
                'error': 'Invalid authentication token'
            }), 401)

        if not firebase_user or not firebase_user.get('uid'):
            return None, (jsonify({
                'success': False,
                'error': 'Invalid Firebase token'
            }), 401)

        # Get user from database
        db = get_database()
        users_collection = db['users']
        user = users_collection.find_one({'googleId': firebase_user['uid']})

        if not user:
            return None, (jsonify({
                'success': False,
                'error': 'User not found in database'
            }), 401)

        return user, None

    except Exception as e:
        return None, (jsonify({
            'success': False,
            'error': f'Authentication failed: {str(e)}'
        }), 500)