"""
Test module for Slack webhook signature verification.

Tests webhook signature validation, request parsing, and security measures
following the TDD approach outlined in dev-guide.md.
"""

import os
import json
import hmac
import hashlib
import time
from unittest.mock import patch, Mock
import pytest
from backend.utils.slack_webhook_validator import SlackWebhookValidator


class TestSlackWebhookValidator:
    """Test cases for Slack webhook signature verification."""

    def test_webhook_validator_initialization(self):
        """Test that SlackWebhookValidator initializes with signing secret."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            assert validator.signing_secret == '0efe4a3d2e74103a6bd0209f5147646e'

    def test_missing_signing_secret_raises_error(self):
        """Test that missing signing secret raises ValueError."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="SLACK_SIGNING_SECRET environment variable is required"):
                SlackWebhookValidator()

    def test_valid_signature_verification(self):
        """Test that valid signatures are correctly verified."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            # Create test payload
            timestamp = str(int(time.time()))
            body = json.dumps({"type": "url_verification", "challenge": "test_challenge"})
            
            # Generate valid signature
            sig_basestring = f"v0:{timestamp}:{body}"
            signature = "v0=" + hmac.new(
                b'0efe4a3d2e74103a6bd0209f5147646e',
                sig_basestring.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Test validation
            is_valid = validator.verify_signature(body, timestamp, signature)
            assert is_valid is True

    def test_invalid_signature_verification(self):
        """Test that invalid signatures are rejected."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            timestamp = str(int(time.time()))
            body = json.dumps({"type": "url_verification", "challenge": "test_challenge"})
            invalid_signature = "v0=invalid_signature_hash"
            
            is_valid = validator.verify_signature(body, timestamp, invalid_signature)
            assert is_valid is False

    def test_timestamp_too_old_rejected(self):
        """Test that requests with old timestamps are rejected."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            # Create timestamp that's too old (more than 5 minutes)
            old_timestamp = str(int(time.time()) - 400)  # 400 seconds = 6.67 minutes
            body = json.dumps({"type": "event_callback"})
            
            # Generate valid signature for old timestamp
            sig_basestring = f"v0:{old_timestamp}:{body}"
            signature = "v0=" + hmac.new(
                b'0efe4a3d2e74103a6bd0209f5147646e',
                sig_basestring.encode(),
                hashlib.sha256
            ).hexdigest()
            
            is_valid = validator.verify_signature(body, old_timestamp, signature)
            assert is_valid is False

    def test_malformed_signature_rejected(self):
        """Test that malformed signatures are rejected."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            timestamp = str(int(time.time()))
            body = json.dumps({"type": "event_callback"})
            
            # Test various malformed signatures
            malformed_signatures = [
                "invalid_format",
                "v1=hash_with_wrong_version",
                "v0=",
                "",
                None
            ]
            
            for bad_sig in malformed_signatures:
                is_valid = validator.verify_signature(body, timestamp, bad_sig)
                assert is_valid is False

    def test_url_verification_challenge_handling(self):
        """Test handling of Slack URL verification challenge."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            challenge = "test_challenge_string_123"
            payload = {
                "token": "DUQYU39OVuFKULF9MliTCLye",
                "challenge": challenge,
                "type": "url_verification"
            }
            
            result = validator.handle_url_verification(payload)
            assert result == challenge

    def test_url_verification_invalid_payload(self):
        """Test URL verification with invalid payload."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            # Missing challenge
            invalid_payload = {
                "token": "DUQYU39OVuFKULF9MliTCLye",
                "type": "url_verification"
            }
            
            result = validator.handle_url_verification(invalid_payload)
            assert result is None

    def test_event_payload_validation(self):
        """Test validation of event callback payloads."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            # Valid event payload
            valid_payload = {
                "token": "DUQYU39OVuFKULF9MliTCLye",
                "type": "event_callback",
                "event": {
                    "type": "app_mention",
                    "user": "U1234567",
                    "text": "<@U0BOTUSER> create task for meeting",
                    "ts": "1234567890.123456",
                    "channel": "C1234567"
                }
            }
            
            is_valid = validator.validate_event_payload(valid_payload)
            assert is_valid is True

    def test_event_payload_validation_missing_fields(self):
        """Test validation fails with missing required fields."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            # Missing event field
            invalid_payload = {
                "token": "DUQYU39OVuFKULF9MliTCLye",
                "type": "event_callback"
            }
            
            is_valid = validator.validate_event_payload(invalid_payload)
            assert is_valid is False

    def test_extract_mention_from_app_mention_event(self):
        """Test extraction of mention content from app_mention events."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            event = {
                "type": "app_mention",
                "user": "U1234567",
                "text": "<@U0BOTUSER> create task for meeting tomorrow",
                "ts": "1234567890.123456",
                "channel": "C1234567"
            }
            
            mention_text = validator.extract_mention_text(event)
            assert mention_text == "create task for meeting tomorrow"

    def test_extract_mention_handles_complex_mentions(self):
        """Test extraction handles complex mention patterns."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            event = {
                "type": "app_mention",
                "text": "Hey <@U0BOTUSER>, can you <@U1234567> help with this task?",
                "ts": "1234567890.123456"
            }
            
            mention_text = validator.extract_mention_text(event)
            assert mention_text == "Hey , can you <@U1234567> help with this task?"

    def test_rate_limiting_detection(self):
        """Test detection of rate limiting scenarios."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            validator = SlackWebhookValidator()
            
            # Simulate multiple requests from same user
            user_id = "U1234567"
            current_time = time.time()
            
            # First request should be allowed
            assert validator.check_rate_limit(user_id) is True
            
            # Simulate hitting rate limit by adding 10 requests in cache
            validator._rate_limit_cache[user_id] = [current_time] * 10
            
            # Should be rate limited now
            assert validator.check_rate_limit(user_id) is False