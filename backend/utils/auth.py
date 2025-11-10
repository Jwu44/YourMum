"""
Auth utilities for Firebase token verification and initialization.

Centralizes dev bypass, Firebase Admin initialization, and token verification
to avoid duplication across API modules.
"""

from typing import Optional, Dict, Any, Tuple
import os
import json
import traceback
from time import time

import firebase_admin
from firebase_admin import credentials, get_app

# Token verification cache to avoid repeated Firebase API calls
# Structure: {token: (decoded_data, expiry_timestamp)}
_token_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}


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


def _verify_token_from_firebase(token: str) -> Optional[Dict[str, Any]]:
    """
    Internal function to verify token directly from Firebase (network call).

    This is the expensive operation that makes an HTTPS request to Firebase servers.
    Should only be called when cache misses or token is not cached.

    Args:
        token: Firebase ID token to verify

    Returns:
        Decoded token data or None if verification fails
    """
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


def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a Firebase ID token with caching to improve performance.

    Caches verified tokens for 55 minutes (tokens expire after 1 hour) to avoid
    repeated network calls to Firebase servers on every API request. This significantly
    improves response time in production environments.

    Supports development bypass when NODE_ENV=development and token matches
    the mock token used on the frontend.

    Args:
        token: Firebase ID token to verify

    Returns:
        Decoded token data containing uid, email, etc., or None if verification fails
    """
    if not token:
        return None

    # Development bypass - no caching needed for mock tokens
    if os.getenv('NODE_ENV') == 'development' and token == 'mock-token-for-development':
        return {
            'uid': 'dev_test_user_12345',
            'email': 'dev@example.com',
            'name': 'Dev User Updated'
        }

    # Check cache first (avoid expensive Firebase network call)
    current_time = time()
    if token in _token_cache:
        cached_data, expiry = _token_cache[token]
        if current_time < expiry:
            # Cache hit - return cached data without network call
            return cached_data
        else:
            # Cache expired - remove stale entry
            del _token_cache[token]

    # Cache miss or expired - verify with Firebase (expensive network call)
    decoded_token = _verify_token_from_firebase(token)

    if decoded_token:
        # Cache for 55 minutes (tokens expire in 1 hour, use 55min for safety margin)
        cache_duration = 55 * 60  # 55 minutes in seconds
        _token_cache[token] = (decoded_token, current_time + cache_duration)

        # Optional: Clean up old cache entries periodically (basic LRU)
        # Keep cache size reasonable by removing oldest 10% when it grows too large
        if len(_token_cache) > 1000:
            _cleanup_token_cache()

    return decoded_token


def _cleanup_token_cache() -> None:
    """
    Clean up expired and old entries from token cache.

    Removes expired entries and limits cache to 900 most recent tokens
    to prevent unbounded memory growth.
    """
    current_time = time()

    # Remove expired entries
    expired_tokens = [
        token for token, (_, expiry) in _token_cache.items()
        if current_time >= expiry
    ]
    for token in expired_tokens:
        del _token_cache[token]

    # If still too large, remove oldest 10% by expiry time
    if len(_token_cache) > 900:
        sorted_by_expiry = sorted(_token_cache.items(), key=lambda x: x[1][1])
        tokens_to_remove = sorted_by_expiry[:100]  # Remove oldest 100
        for token, _ in tokens_to_remove:
            del _token_cache[token]


def get_user_id_from_token(token: str) -> Optional[str]:
    """Return the user ID (uid) from a Firebase ID token, or None if invalid."""
    decoded = verify_firebase_token(token)
    if not decoded:
        return None
    return decoded.get('uid')


def clear_token_cache() -> None:
    """
    Clear the entire token verification cache.

    Useful for testing, forced logout scenarios, or when you need to
    force re-verification of all tokens.
    """
    global _token_cache
    _token_cache.clear()


def get_cache_stats() -> Dict[str, int]:
    """
    Get statistics about the token cache for monitoring.

    Returns:
        Dictionary with cache size and expired entry count
    """
    current_time = time()
    expired_count = sum(
        1 for _, expiry in _token_cache.values()
        if current_time >= expiry
    )
    return {
        'total_entries': len(_token_cache),
        'expired_entries': expired_count,
        'active_entries': len(_token_cache) - expired_count
    }


def verify_session_cookie_local(session_cookie: str, check_revoked: bool = True) -> Optional[Dict[str, Any]]:
    """
    Verify a Firebase session cookie locally (no network call).

    This is the fast path for authentication - verifies the cryptographic signature
    of the session cookie without making any network requests. This provides
    consistent sub-5ms performance in production.

    Args:
        session_cookie: The Firebase session cookie to verify
        check_revoked: Whether to check if the session has been revoked (default True)
                      Note: Checking revocation requires a database lookup

    Returns:
        Decoded session cookie data containing uid, email, etc., or None if invalid

    Performance:
        - Without revocation check: <5ms (pure cryptographic verification)
        - With revocation check: ~20-50ms (includes Firebase database lookup)
    """
    if not session_cookie:
        return None

    # Ensure Firebase Admin is initialized
    if not firebase_admin._apps:
        if not _initialize_firebase_from_env():
            return None

    try:
        from firebase_admin import auth
        # Local verification - no network call to Firebase servers!
        # Only cryptographic signature validation
        decoded = auth.verify_session_cookie(session_cookie, check_revoked=check_revoked)
        return decoded
    except Exception as e:
        # Don't log every verification failure (could be expired cookies, etc.)
        # Only log unexpected errors
        if 'revoked' not in str(e).lower() and 'expired' not in str(e).lower():
            print(f"Auth utils: Session cookie verification error: {e}")
        return None


def create_session_cookie_from_token(id_token: str, expires_in_days: int = 14) -> Optional[str]:
    """
    Create a Firebase session cookie from a Firebase ID token.

    This should be called once during login after verifying the ID token.
    The session cookie can then be used for fast authentication on subsequent requests.

    Args:
        id_token: The Firebase ID token from client authentication
        expires_in_days: Session cookie expiry in days (max 14 days per Firebase limit)

    Returns:
        Session cookie string, or None if creation failed

    Note:
        Firebase enforces a maximum session cookie duration of 14 days.
        Attempting to set a longer duration will result in an error.
    """
    if not id_token:
        return None

    # Ensure Firebase Admin is initialized
    if not firebase_admin._apps:
        if not _initialize_firebase_from_env():
            return None

    try:
        from firebase_admin import auth
        from datetime import timedelta

        # Enforce Firebase's 14-day maximum
        if expires_in_days > 14:
            expires_in_days = 14

        expires_in = timedelta(days=expires_in_days)
        session_cookie = auth.create_session_cookie(id_token, expires_in=expires_in)
        return session_cookie
    except Exception as e:
        print(f"Auth utils: Session cookie creation error: {e}")
        traceback.print_exc()
        return None


