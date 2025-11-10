"""
Unit tests for Firebase token caching functionality.

Tests verify that token verification caching works correctly and improves
performance by avoiding repeated network calls to Firebase.
"""

import pytest
from unittest.mock import patch, MagicMock
from time import time

from backend.utils.auth import (
    verify_firebase_token,
    clear_token_cache,
    get_cache_stats,
    _verify_token_from_firebase
)


@pytest.fixture(autouse=True)
def reset_cache():
    """Clear token cache before each test."""
    clear_token_cache()
    yield
    clear_token_cache()


def test_token_cache_miss_then_hit():
    """Test that first verification misses cache, second hits cache."""
    mock_token = "test_firebase_token_123"
    mock_decoded = {
        'uid': 'test_user_123',
        'email': 'test@example.com'
    }

    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        mock_verify.return_value = mock_decoded

        # First call - should call Firebase (cache miss)
        result1 = verify_firebase_token(mock_token)
        assert result1 == mock_decoded
        assert mock_verify.call_count == 1

        # Second call - should use cache (no Firebase call)
        result2 = verify_firebase_token(mock_token)
        assert result2 == mock_decoded
        assert mock_verify.call_count == 1  # Still 1 - cache hit!

        # Third call - should still use cache
        result3 = verify_firebase_token(mock_token)
        assert result3 == mock_decoded
        assert mock_verify.call_count == 1  # Still 1 - cache hit!


def test_cache_expiry():
    """Test that expired tokens are re-verified."""
    mock_token = "test_firebase_token_456"
    mock_decoded = {
        'uid': 'test_user_456',
        'email': 'test2@example.com'
    }

    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        mock_verify.return_value = mock_decoded

        # Mock time to control cache expiry
        with patch('backend.utils.auth.time') as mock_time:
            # First call at time 0
            mock_time.return_value = 0
            result1 = verify_firebase_token(mock_token)
            assert result1 == mock_decoded
            assert mock_verify.call_count == 1

            # Second call at time 100 (still within 55 min cache)
            mock_time.return_value = 100
            result2 = verify_firebase_token(mock_token)
            assert result2 == mock_decoded
            assert mock_verify.call_count == 1  # Cache hit

            # Third call after expiry (55 min = 3300 seconds)
            mock_time.return_value = 3301
            result3 = verify_firebase_token(mock_token)
            assert result3 == mock_decoded
            assert mock_verify.call_count == 2  # Re-verified after expiry


def test_different_tokens_cached_separately():
    """Test that different tokens are cached separately."""
    token1 = "token_aaa"
    token2 = "token_bbb"
    decoded1 = {'uid': 'user_1'}
    decoded2 = {'uid': 'user_2'}

    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        # Return different results for different tokens
        mock_verify.side_effect = lambda t: decoded1 if t == token1 else decoded2

        # Verify token1
        result1 = verify_firebase_token(token1)
        assert result1 == decoded1
        assert mock_verify.call_count == 1

        # Verify token2
        result2 = verify_firebase_token(token2)
        assert result2 == decoded2
        assert mock_verify.call_count == 2

        # Verify token1 again (should hit cache)
        result1_cached = verify_firebase_token(token1)
        assert result1_cached == decoded1
        assert mock_verify.call_count == 2  # No new call

        # Verify token2 again (should hit cache)
        result2_cached = verify_firebase_token(token2)
        assert result2_cached == decoded2
        assert mock_verify.call_count == 2  # No new call


def test_cache_stats():
    """Test cache statistics reporting."""
    # Empty cache initially
    stats = get_cache_stats()
    assert stats['total_entries'] == 0
    assert stats['active_entries'] == 0

    # Add some tokens
    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        mock_verify.return_value = {'uid': 'test_user'}

        verify_firebase_token("token1")
        verify_firebase_token("token2")
        verify_firebase_token("token3")

        stats = get_cache_stats()
        assert stats['total_entries'] == 3
        assert stats['active_entries'] == 3
        assert stats['expired_entries'] == 0


def test_clear_cache():
    """Test manual cache clearing."""
    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        mock_verify.return_value = {'uid': 'test_user'}

        # Add token to cache
        verify_firebase_token("token1")
        assert mock_verify.call_count == 1

        # Second call should hit cache
        verify_firebase_token("token1")
        assert mock_verify.call_count == 1

        # Clear cache
        clear_token_cache()

        # Third call should miss cache and re-verify
        verify_firebase_token("token1")
        assert mock_verify.call_count == 2


def test_dev_bypass_not_cached():
    """Test that development bypass tokens are not cached."""
    import os
    with patch.dict(os.environ, {'NODE_ENV': 'development'}):
        # Dev token should bypass cache entirely
        result = verify_firebase_token('mock-token-for-development')
        assert result['uid'] == 'dev_test_user_12345'

        # Check cache is empty (dev tokens not cached)
        stats = get_cache_stats()
        assert stats['total_entries'] == 0


def test_failed_verification_not_cached():
    """Test that failed verifications are not cached."""
    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        mock_verify.return_value = None  # Failed verification

        # First call - verification fails
        result1 = verify_firebase_token("invalid_token")
        assert result1 is None
        assert mock_verify.call_count == 1

        # Second call - should retry (not cached)
        result2 = verify_firebase_token("invalid_token")
        assert result2 is None
        assert mock_verify.call_count == 2  # Called again, not cached


def test_cache_cleanup_on_overflow():
    """Test that cache cleans up when it grows too large."""
    with patch('backend.utils.auth._verify_token_from_firebase') as mock_verify:
        mock_verify.return_value = {'uid': 'test_user'}

        # Add 1001 tokens to trigger cleanup
        for i in range(1001):
            verify_firebase_token(f"token_{i}")

        # Cache should have cleaned up to ~900 entries
        stats = get_cache_stats()
        assert stats['total_entries'] <= 900


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
