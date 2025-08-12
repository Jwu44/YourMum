"""
Auth utilities for Firebase token verification and initialization.

Centralizes dev bypass, Firebase Admin initialization, and token verification
to avoid duplication across API modules.
"""

from typing import Optional, Dict, Any
import os
import json
import traceback

import firebase_admin
from firebase_admin import credentials, get_app


def _initialize_firebase_from_env() -> Optional[firebase_admin.App]:
    """Initialize Firebase Admin SDK using FIREBASE_JSON when available.

    Falls back to default initialization if FIREBASE_JSON is missing.
    """
    try:
        try:
            return get_app()  # Already initialized
        except ValueError:
            pass

        firebase_json = os.environ.get('FIREBASE_JSON')
        if firebase_json:
            try:
                creds_dict = json.loads(firebase_json)
                cred = credentials.Certificate(creds_dict)
                return firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Auth utils: Failed to initialize Firebase from FIREBASE_JSON: {e}")
                traceback.print_exc()

        # Fallback: default initialization (environment-provided credentials)
        try:
            return firebase_admin.initialize_app()
        except Exception as e:
            print(f"Auth utils: Default Firebase initialization error: {e}")
            traceback.print_exc()
            return None
    except Exception as e:
        print(f"Auth utils: Unexpected Firebase initialization error: {e}")
        traceback.print_exc()
        return None


def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a Firebase ID token and return the decoded token, or None on failure.

    Supports development bypass when NODE_ENV=development and token matches
    the mock token used on the frontend.
    """
    if not token:
        return None

    # Development bypass
    if os.getenv('NODE_ENV') == 'development' and token == 'mock-token-for-development':
        return {
            'uid': 'dev-user-123',
            'email': 'dev@example.com',
            'name': 'Dev User'
        }

    # Ensure Firebase Admin is initialized
    if not firebase_admin._apps:
        if not _initialize_firebase_from_env():
            return None

    try:
        from firebase_admin import auth
        return auth.verify_id_token(token)
    except Exception as e:
        print(f"Auth utils: Token verification error: {e}")
        traceback.print_exc()
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """Return the user ID (uid) from a Firebase ID token, or None if invalid."""
    decoded = verify_firebase_token(token)
    if not decoded:
        return None
    return decoded.get('uid')


