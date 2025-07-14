"""
Slack Service Module - Klavis AI MCP Integration

This module provides Slack integration functionality through Klavis AI MCP server:
- Creating Slack MCP server instances
- Handling OAuth flow for Slack authorization
- Converting Slack messages to yourdai Task objects
- Managing Slack integration status and connections
"""

import os
import json
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
from dotenv import load_dotenv

from backend.models.task import Task

# Load environment variables
load_dotenv()

class SlackService:
    """
    Service class for managing Slack integration through Klavis AI MCP server.
    
    Handles all Slack-related operations including OAuth, message processing,
    and task creation from Slack @mentions.
    """

    def __init__(self):
        """Initialize the Slack service with Klavis AI configuration."""
        self.klavis_api_key = os.environ.get("KLAVIS_API_KEY")
        if not self.klavis_api_key:
            raise ValueError("KLAVIS_API_KEY environment variable is required")

    def create_slack_server_instance(
        self, 
        user_id: str, 
        platform_name: str = "yourdai"
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create a new Slack MCP server instance via Klavis AI.
        
        Args:
            user_id: User's unique identifier
            platform_name: Platform name for the integration
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            server instance data on success or error message on failure
        """
        try:
            # Import klavis here to avoid issues if not installed
            from klavis import Klavis
            from klavis.types import McpServerName
            
            # Initialize Klavis client
            klavis_client = Klavis(api_key=self.klavis_api_key)
            
            # Create Slack MCP server instance
            slack_server = klavis_client.mcp_server.create_server_instance(
                server_name=McpServerName.SLACK,
                user_id=user_id,
                platform_name=platform_name,
            )
            
            return True, {
                "serverUrl": slack_server.server_url,
                "instanceId": slack_server.instance_id,
                "oauthUrl": slack_server.oauth_url
            }
            
        except ImportError:
            return False, {"error": "Klavis SDK not installed. Please install klavis package."}
        except Exception as e:
            return False, {"error": f"Failed to create Slack server instance: {str(e)}"}

    def get_slack_integration_status(
        self, 
        user_id: str, 
        instance_id: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check the status of Slack integration for a user.
        
        Args:
            user_id: User's unique identifier
            instance_id: Optional Klavis instance ID to check specific instance
            
        Returns:
            Tuple of (success: bool, result: Dict) with integration status
        """
        try:
            # For now, return basic status - this can be enhanced with actual
            # Klavis API calls to check instance status when available
            status = {
                "connected": bool(instance_id),
                "instanceId": instance_id,
                "lastSyncTime": datetime.now().isoformat() if instance_id else None
            }
            
            return True, status
            
        except Exception as e:
            return False, {"error": f"Failed to get integration status: {str(e)}"}

    def process_slack_webhook(
        self, 
        webhook_data: Dict[str, Any]
    ) -> Tuple[bool, Optional[Task], Optional[str]]:
        """
        Process incoming webhook data from Klavis AI when user gets @mentioned.
        
        Args:
            webhook_data: Webhook payload from Klavis AI containing Slack message data
            
        Returns:
            Tuple of (success: bool, task: Optional[Task], error_message: Optional[str]) 
            where task is the created Task object or None if processing failed
        """
        try:
            # Validate webhook payload structure
            validation_success, validation_error = self._validate_webhook_payload(webhook_data)
            if not validation_success:
                print(f"Webhook validation failed: {validation_error}")
                return False, None, validation_error
            
            # Extract message data from webhook
            message_data = webhook_data.get("message", {})
            message_text = message_data.get("text", "")
            slack_message_url = message_data.get("permalink", "")
            message_ts = message_data.get("ts", "")
            channel_id = message_data.get("channel", "")
            
            # Validate required message fields
            if not message_text.strip():
                return False, None, "Empty message text"
            
            if not message_ts:
                return False, None, "Missing message timestamp"
            
            # Create Task object from Slack message with additional metadata
            task = self.convert_slack_message_to_task(
                message_text=message_text,
                slack_message_url=slack_message_url,
                message_ts=message_ts,
                channel_id=channel_id
            )
            
            return True, task, None
            
        except Exception as e:
            error_msg = f"Error processing Slack webhook: {str(e)}"
            print(error_msg)
            return False, None, error_msg

    def _validate_webhook_payload(self, webhook_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate the structure of incoming webhook payload.
        
        Args:
            webhook_data: Webhook payload to validate
            
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        try:
            # Check for required top-level fields
            if not isinstance(webhook_data, dict):
                return False, "Webhook data must be a dictionary"
            
            # Check for message field
            if "message" not in webhook_data:
                return False, "Missing 'message' field in webhook data"
            
            message = webhook_data["message"]
            if not isinstance(message, dict):
                return False, "Message field must be a dictionary"
            
            # Check for required message fields
            required_fields = ["text", "ts"]
            missing_fields = [field for field in required_fields if field not in message]
            if missing_fields:
                return False, f"Missing required message fields: {', '.join(missing_fields)}"
            
            return True, None
            
        except Exception as e:
            return False, f"Validation error: {str(e)}"

    def check_duplicate_message(
        self, 
        user_id: str, 
        message_ts: str, 
        channel_id: str
    ) -> bool:
        """
        Check if a Slack message has already been processed to prevent duplicates.
        
        Args:
            user_id: User's unique identifier
            message_ts: Slack message timestamp
            channel_id: Slack channel ID
            
        Returns:
            True if message is duplicate, False if it's new
        """
        try:
            # Development bypass for database operations
            if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
                print(f"DEBUG: Skipping duplicate check for dev user {user_id}")
                return False
            
            from backend.db_config import get_database
            
            # Get database and create collection for tracking processed messages
            db = get_database()
            processed_messages = db['slack_processed_messages']
            
            # Create unique identifier for this message
            message_key = f"{user_id}:{channel_id}:{message_ts}"
            
            # Check if message already exists
            existing = processed_messages.find_one({"message_key": message_key})
            
            if existing:
                print(f"Duplicate Slack message detected: {message_key}")
                return True
            
            # Mark message as processed
            processed_messages.insert_one({
                "message_key": message_key,
                "user_id": user_id,
                "channel_id": channel_id,
                "message_ts": message_ts,
                "processed_at": datetime.now(),
                "created_at": datetime.now()
            })
            
            return False
            
        except Exception as e:
            print(f"Error checking duplicate message: {str(e)}")
            # If we can't check for duplicates, allow the message through
            return False

    def convert_slack_message_to_task(
        self, 
        message_text: str, 
        slack_message_url: Optional[str] = None,
        message_ts: Optional[str] = None,
        channel_id: Optional[str] = None
    ) -> Task:
        """
        Convert a Slack message into a yourdai Task object.
        
        Args:
            message_text: Raw Slack message text
            slack_message_url: URL to the original Slack message
            message_ts: Slack message timestamp for tracking
            channel_id: Slack channel ID for reference
            
        Returns:
            Task object configured for Slack-sourced tasks
        """
        # Clean up message text (remove @mentions, extra whitespace)
        cleaned_text = self._clean_slack_message_text(message_text)
        
        # Enhance task text with channel context if available
        if channel_id and not slack_message_url:
            # If we don't have a permalink but have channel ID, note the source
            enhanced_text = f"{cleaned_text} (from Slack #{channel_id})"
        else:
            enhanced_text = cleaned_text
        
        # Create Task with Slack-specific configuration
        task = Task(
            text=enhanced_text,
            categories=["Work"],  # Hard-coded as per requirements
            source="slack",
            slack_message_url=slack_message_url,
            completed=False
        )
        
        return task

    def disconnect_slack_integration(
        self, 
        user_id: str, 
        instance_id: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Disconnect Slack integration for a user.
        
        Args:
            user_id: User's unique identifier
            instance_id: Klavis instance ID to disconnect
            
        Returns:
            Tuple of (success: bool, result: Dict) with disconnection status
        """
        try:
            # Development bypass for external API calls
            if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
                print(f"DEBUG: Skipping external Klavis API disconnect call for dev user {user_id}")
                return True, {"message": "Slack integration disconnected successfully (dev mode)"}
            
            # TODO: Add actual Klavis API call to delete instance when available
            # For now, return success - this can be enhanced with actual
            # Klavis API calls to delete instance when available
            return True, {"message": "Slack integration disconnected successfully"}
            
        except Exception as e:
            return False, {"error": f"Failed to disconnect integration: {str(e)}"}

    def _clean_slack_message_text(self, message_text: str) -> str:
        """
        Clean up Slack message text for use as task text.
        
        Args:
            message_text: Raw Slack message text
            
        Returns:
            Cleaned message text suitable for task creation
        """
        # Remove @mentions (e.g., <@U1234567>)
        import re
        cleaned = re.sub(r'<@[A-Z0-9]+>', '', message_text)
        
        # Remove extra whitespace
        cleaned = ' '.join(cleaned.split())
        
        # Remove leading/trailing whitespace
        cleaned = cleaned.strip()
        
        return cleaned 

    def check_oauth_completion_status(
        self, 
        instance_id: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if OAuth has been completed for a Klavis server instance.
        
        This method attempts to verify if the Slack OAuth flow has been completed
        by checking if the server instance can authenticate with Slack.
        
        Args:
            instance_id: The Klavis server instance ID to check
            
        Returns:
            Tuple of (success: bool, status: Dict) where status contains:
            - oauth_completed: boolean indicating if OAuth is complete
            - authenticated: boolean indicating if instance is authenticated
            - error: error message if check failed
        """
        try:
            # Import klavis here to avoid issues if not installed
            from klavis import Klavis
            
            # Initialize Klavis client
            klavis_client = Klavis(api_key=self.klavis_api_key)
            
            # Attempt to get server instance details or test authentication
            # Note: This is a simplified check - actual Klavis SDK method may differ
            try:
                # Try to list tools for the instance - this requires authentication
                server_url = f"https://slack-mcp-server.klavis.ai/mcp/?instance_id={instance_id}"
                tools_response = klavis_client.mcp_server.list_tools(server_url=server_url)
                
                # If we can list tools, OAuth is complete and authenticated
                if tools_response and hasattr(tools_response, 'tools'):
                    return True, {
                        "oauth_completed": True,
                        "authenticated": True
                    }
                else:
                    return True, {
                        "oauth_completed": False,
                        "authenticated": False
                    }
                    
            except Exception as auth_error:
                # If authentication fails, OAuth might not be complete
                error_str = str(auth_error).lower()
                if "unauthorized" in error_str or "authentication" in error_str:
                    return True, {
                        "oauth_completed": False,
                        "authenticated": False
                    }
                else:
                    # Some other error occurred
                    return False, {"error": f"OAuth check failed: {str(auth_error)}"}
            
        except ImportError:
            return False, {"error": "Klavis SDK not installed. Please install klavis package."}
        except Exception as e:
            return False, {"error": f"Failed to check OAuth status: {str(e)}"} 