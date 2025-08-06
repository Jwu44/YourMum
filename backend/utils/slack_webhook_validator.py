"""
Slack Webhook Signature Verification Utility

This module provides security validation for incoming Slack webhook requests,
including signature verification, timestamp validation, and payload processing.

Follows Slack's security guidelines for webhook signature verification:
https://api.slack.com/authentication/verifying-requests-from-slack
"""

import os
import hmac
import hashlib
import time
import re
from typing import Dict, Any, Optional


class SlackWebhookValidator:
    """
    Utility class for validating Slack webhook requests.
    
    Provides signature verification, timestamp validation, and payload processing
    for secure Slack Events API integration.
    """
    
    def __init__(self):
        """Initialize webhook validator with signing secret."""
        self.signing_secret = self._get_signing_secret()
        self._rate_limit_cache = {}  # Simple in-memory rate limiting
        self.max_timestamp_age = 300  # 5 minutes in seconds
        self.rate_limit_window = 60   # 1 minute in seconds
        self.rate_limit_max_requests = 10  # Max requests per window
    
    def _get_signing_secret(self) -> str:
        """
        Get Slack signing secret from environment.
        
        Returns:
            Slack signing secret
            
        Raises:
            ValueError: If signing secret is not configured
        """
        signing_secret = os.environ.get("SLACK_SIGNING_SECRET", "").strip()
        if not signing_secret:
            raise ValueError("SLACK_SIGNING_SECRET environment variable is required")
        return signing_secret
    
    def verify_signature(self, body: str, timestamp: str, signature: str) -> bool:
        """
        Verify Slack webhook request signature.
        
        Args:
            body: Raw request body as string
            timestamp: Request timestamp from X-Slack-Request-Timestamp header
            signature: Signature from X-Slack-Signature header
            
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Validate signature format
            if not signature or not signature.startswith("v0="):
                return False
            
            # Check timestamp age to prevent replay attacks
            if not self._is_timestamp_valid(timestamp):
                return False
            
            # Generate expected signature
            sig_basestring = f"v0:{timestamp}:{body}"
            expected_signature = "v0=" + hmac.new(
                self.signing_secret.encode(),
                sig_basestring.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Use secure comparison to prevent timing attacks
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, TypeError) as e:
            print(f"Signature verification error: {e}")
            return False
    
    def _is_timestamp_valid(self, timestamp: str) -> bool:
        """
        Validate request timestamp to prevent replay attacks.
        
        Args:
            timestamp: Request timestamp as string
            
        Returns:
            True if timestamp is valid and recent, False otherwise
        """
        try:
            request_time = int(timestamp)
            current_time = int(time.time())
            
            # Check if timestamp is too old (prevents replay attacks)
            if abs(current_time - request_time) > self.max_timestamp_age:
                return False
            
            return True
            
        except (ValueError, TypeError):
            return False
    
    def handle_url_verification(self, payload: Dict[str, Any]) -> Optional[str]:
        """
        Handle Slack URL verification challenge.
        
        Args:
            payload: Request payload containing challenge
            
        Returns:
            Challenge string if valid, None otherwise
        """
        try:
            if payload.get("type") == "url_verification":
                challenge = payload.get("challenge")
                if challenge:
                    return challenge
            return None
            
        except (KeyError, TypeError):
            return None
    
    def validate_event_payload(self, payload: Dict[str, Any]) -> bool:
        """
        Validate event callback payload structure.
        
        Args:
            payload: Event callback payload
            
        Returns:
            True if payload is valid, False otherwise
        """
        try:
            # Check required top-level fields
            if payload.get("type") != "event_callback":
                return False
            
            # Check for event field
            event = payload.get("event")
            if not isinstance(event, dict):
                return False
            
            # Check for required event fields
            required_fields = ["type", "ts"]
            if not all(field in event for field in required_fields):
                return False
            
            return True
            
        except (KeyError, TypeError, AttributeError):
            return False
    
    def extract_mention_text(self, event: Dict[str, Any]) -> str:
        """
        Extract clean text from app_mention event, removing bot mentions.
        
        Args:
            event: Slack app_mention event data
            
        Returns:
            Cleaned text with bot mention removed
        """
        try:
            text = event.get("text", "")
            
            # Remove bot mention (typically first mention in app_mention events)
            # Pattern matches <@USERID> format
            cleaned_text = re.sub(r'<@U[A-Z0-9]+>', '', text, count=1)
            
            # Clean up extra whitespace
            cleaned_text = ' '.join(cleaned_text.split())
            
            return cleaned_text.strip()
            
        except (KeyError, TypeError, AttributeError):
            return ""
    
    def check_rate_limit(self, user_id: str, team_id: Optional[str] = None) -> bool:
        """
        Rate limiting check for webhook requests with multi-workspace support.
        
        Args:
            user_id: Slack user ID to check
            team_id: Optional team ID for workspace-specific rate limiting
            
        Returns:
            True if request is allowed, False if rate limited
        """
        try:
            current_time = time.time()
            
            # Create composite key for multi-workspace rate limiting
            rate_limit_key = f"{user_id}:{team_id}" if team_id else user_id
            
            # Clean old entries from cache
            self._cleanup_rate_limit_cache(current_time)
            
            # Get user's recent requests
            user_requests = self._rate_limit_cache.get(rate_limit_key, [])
            
            # Filter recent requests within window
            recent_requests = [
                req_time for req_time in user_requests
                if current_time - req_time < self.rate_limit_window
            ]
            
            # Check if user has exceeded rate limit
            if len(recent_requests) >= self.rate_limit_max_requests:
                return False
            
            # Add current request
            recent_requests.append(current_time)
            self._rate_limit_cache[rate_limit_key] = recent_requests
            
            return True
            
        except (KeyError, TypeError):
            return True  # Allow request on error
    
    def _cleanup_rate_limit_cache(self, current_time: float) -> None:
        """
        Clean up old entries from rate limit cache.
        
        Args:
            current_time: Current timestamp for cleanup
        """
        try:
            # Remove entries older than rate limit window
            cutoff_time = current_time - self.rate_limit_window
            
            for user_id in list(self._rate_limit_cache.keys()):
                user_requests = self._rate_limit_cache[user_id]
                filtered_requests = [
                    req_time for req_time in user_requests
                    if req_time > cutoff_time
                ]
                
                if filtered_requests:
                    self._rate_limit_cache[user_id] = filtered_requests
                else:
                    del self._rate_limit_cache[user_id]
                    
        except (KeyError, TypeError):
            pass  # Ignore cleanup errors
    
    def is_relevant_event(self, event: Dict[str, Any]) -> bool:
        """
        Check if event is relevant for task creation in multi-workspace context.
        
        Args:
            event: Slack event data
            
        Returns:
            True if event should be processed, False otherwise
        """
        try:
            event_type = event.get("type")
            
            # Handle app mentions (direct @mentions) - works across all workspaces
            if event_type == "app_mention":
                return True
            
            # Handle direct messages - works across all workspaces
            if event_type == "message":
                channel_type = event.get("channel_type")
                if channel_type == "im":  # Direct message
                    # Only process if message has text (ignore system messages)
                    text = event.get("text", "").strip()
                    return bool(text)
            
            return False
            
        except (KeyError, TypeError):
            return False
    
    def extract_workspace_info(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract workspace information from webhook payload for multi-workspace support.
        
        Args:
            payload: Webhook payload from Slack
            
        Returns:
            Dict containing team_id, team_domain, and enterprise_id if available
        """
        try:
            workspace_info = {
                'team_id': payload.get('team_id', ''),
                'team_domain': payload.get('team_domain', ''),
                'enterprise_id': payload.get('enterprise_id', '')  # For Enterprise Grid
            }
            
            # Also try to get from event data if not in top level
            event = payload.get('event', {})
            if not workspace_info['team_id'] and 'team' in event:
                workspace_info['team_id'] = event.get('team')
                
            return workspace_info
            
        except (KeyError, TypeError):
            return {'team_id': '', 'team_domain': '', 'enterprise_id': ''}
    
    def is_bot_message(self, event: Dict[str, Any]) -> bool:
        """
        Check if message is from a bot to avoid processing bot messages.
        
        Args:
            event: Slack event data
            
        Returns:
            True if message is from a bot, False otherwise
        """
        try:
            # Check if event has bot_id (indicates bot message)
            if event.get('bot_id'):
                return True
                
            # Check if subtype indicates bot message
            subtype = event.get('subtype')
            if subtype in ['bot_message', 'bot_add', 'bot_remove']:
                return True
                
            # Check if user field indicates bot
            user = event.get('user')
            if user and user.startswith('B'):  # Bot user IDs typically start with B
                return True
                
            return False
            
        except (KeyError, TypeError):
            return False