"""
Test Suite for Task Model with Slack Integration
Tests the Task model following TDD approach with Slack metadata support
"""

import pytest
import uuid
from datetime import datetime
from unittest.mock import Mock, patch

# Import the Task model
from backend.models.task import Task, RecurrenceType


class TestTaskModel:
    """Test cases for Task model functionality"""

    @pytest.fixture
    def basic_task_data(self):
        """Sample basic task data for testing"""
        return {
            "text": "Complete project report",
            "categories": ["Work", "Important"],
            "completed": False
        }

    @pytest.fixture
    def slack_event_data(self):
        """Sample Slack event data for testing"""
        return {
            "type": "message",
            "channel": "C1234567890",
            "user": "U0987654321",
            "text": "Can you please review the quarterly report? <@U1111111111>",
            "ts": "1609459200.005500",
            "thread_ts": "1609459100.005400",
            "team_id": "T0123456789",
            "team_domain": "myworkspace",
            "channel_name": "general",
            "user_name": "john.doe",
            "team_name": "My Awesome Team"
        }

    def test_basic_task_creation(self, basic_task_data):
        """Test creating a basic task without Slack metadata"""
        task = Task(**basic_task_data)
        
        # Verify basic properties
        assert task.text == basic_task_data["text"]
        assert task.categories == set(basic_task_data["categories"])
        assert task.completed == basic_task_data["completed"]
        assert task.source is None  # Should default to None in current model
        assert task.slack_message_url is None
        
        # Verify ID is generated
        assert task.id is not None
        assert len(task.id) > 0

    def test_task_with_slack_source(self, basic_task_data):
        """Test creating a task with Slack source information"""
        task_data = {
            **basic_task_data,
            "source": "slack",
            "slack_message_url": "https://myworkspace.slack.com/archives/C1234567890/p1609459200005500"
        }
        
        task = Task(**task_data)
        
        # Verify Slack-specific fields
        assert task.source == "slack"
        assert task.slack_message_url == task_data["slack_message_url"]

    def test_task_to_dict_basic(self, basic_task_data):
        """Test converting basic task to dictionary"""
        task = Task(**basic_task_data)
        task_dict = task.to_dict()
        
        # Verify dictionary structure
        assert task_dict["id"] == task.id
        assert task_dict["text"] == basic_task_data["text"]
        assert set(task_dict["categories"]) == set(basic_task_data["categories"])
        assert task_dict["completed"] == basic_task_data["completed"]
        
        # Verify Slack fields are not included when not set
        assert "source" not in task_dict or task_dict["source"] is None
        assert "slack_message_url" not in task_dict or task_dict["slack_message_url"] is None

    def test_task_to_dict_with_slack(self, basic_task_data):
        """Test converting task with Slack data to dictionary"""
        task_data = {
            **basic_task_data,
            "source": "slack",
            "slack_message_url": "https://myworkspace.slack.com/archives/C1234567890/p1609459200005500"
        }
        
        task = Task(**task_data)
        task_dict = task.to_dict()
        
        # Verify Slack fields are included
        assert task_dict["source"] == "slack"
        assert task_dict["slack_message_url"] == task_data["slack_message_url"]

    def test_task_from_dict_basic(self, basic_task_data):
        """Test creating task from dictionary"""
        task_dict = {
            **basic_task_data,
            "id": str(uuid.uuid4())
        }
        
        task = Task.from_dict(task_dict)
        
        # Verify task creation
        assert task.id == task_dict["id"]
        assert task.text == task_dict["text"]
        assert task.categories == set(task_dict["categories"])
        assert task.completed == task_dict["completed"]

    def test_task_from_dict_with_slack(self, basic_task_data):
        """Test creating task from dictionary with Slack data"""
        task_dict = {
            **basic_task_data,
            "id": str(uuid.uuid4()),
            "source": "slack",
            "slack_message_url": "https://myworkspace.slack.com/archives/C1234567890/p1609459200005500"
        }
        
        task = Task.from_dict(task_dict)
        
        # Verify Slack data
        assert task.source == "slack"
        assert task.slack_message_url == task_dict["slack_message_url"]

    def test_slack_metadata_integration(self, slack_event_data):
        """Test Slack metadata integration"""
        slack_metadata = {
            "channel_id": slack_event_data["channel"],
            "workspace_name": slack_event_data["team_name"],
            "sender_name": slack_event_data["user_name"]
        }
        
        task = Task(
            text="Review quarterly report",
            source="slack",
            slack_message_url="https://myworkspace.slack.com/archives/C1234567890/p1609459200005500",
            slack_metadata=slack_metadata
        )
        
        assert task.source == "slack"
        assert task.slack_message_url is not None
        assert task.slack_metadata is not None
        assert task.slack_metadata["channel_id"] == slack_event_data["channel"]
        assert task.slack_metadata["workspace_name"] == slack_event_data["team_name"]
        assert task.slack_metadata["sender_name"] == slack_event_data["user_name"]

    def test_task_roundtrip_serialization(self, basic_task_data):
        """Test task can be serialized to dict and back without data loss"""
        slack_metadata = {
            "channel_id": "C1234567890",
            "workspace_name": "Test Workspace",
            "sender_name": "john.doe"
        }
        
        original_task = Task(
            **basic_task_data,
            source="slack",
            slack_message_url="https://myworkspace.slack.com/archives/C1234567890/p1609459200005500",
            slack_metadata=slack_metadata
        )
        
        # Serialize to dict
        task_dict = original_task.to_dict()
        
        # Deserialize back to task
        reconstructed_task = Task.from_dict(task_dict)
        
        # Verify all data is preserved
        assert original_task.id == reconstructed_task.id
        assert original_task.text == reconstructed_task.text
        assert original_task.categories == reconstructed_task.categories
        assert original_task.completed == reconstructed_task.completed
        assert original_task.source == reconstructed_task.source
        assert original_task.slack_message_url == reconstructed_task.slack_message_url
        assert original_task.slack_metadata == reconstructed_task.slack_metadata

    def test_task_with_recurrence_and_slack(self, basic_task_data):
        """Test task with both recurrence and Slack integration"""
        recurrence_data = {
            "frequency": "weekly",
            "dayOfWeek": "Monday"
        }
        
        task = Task(
            **basic_task_data,
            source="slack",
            slack_message_url="https://myworkspace.slack.com/archives/C1234567890/p1609459200005500",
            is_recurring=recurrence_data
        )
        
        # Verify both features work together
        assert task.source == "slack"
        assert task.slack_message_url is not None
        assert task.is_recurring is not None
        assert task.is_recurring.frequency == "weekly"
        assert task.is_recurring.day_of_week == "Monday"

    def test_task_backwards_compatibility(self, basic_task_data):
        """Test that existing task creation without Slack fields still works"""
        # This simulates existing task data without Slack fields
        task = Task(**basic_task_data)
        
        # Should not raise errors and should have default values
        assert task.source is None
        assert task.slack_message_url is None
        
        # Should still serialize properly
        task_dict = task.to_dict()
        assert isinstance(task_dict, dict)
        assert task_dict["text"] == basic_task_data["text"]


class TestTaskSlackIntegrationMethods:
    """Test cases for planned Slack-specific Task methods"""
    
    @pytest.fixture
    def slack_event_data(self):
        """Sample Slack event data for testing"""
        return {
            "type": "message",
            "channel": "C1234567890",
            "user": "U0987654321",
            "text": "Can you please review the quarterly report? <@U1111111111>",
            "ts": "1609459200.005500",
            "thread_ts": "1609459100.005400",
            "team_id": "T0123456789",
            "team_domain": "myworkspace",
            "channel_name": "general",
            "user_name": "john.doe",
            "team_name": "My Awesome Team"
        }

    def test_build_web_url(self, slack_event_data):
        """Test web URL building functionality"""
        expected_url = "https://myworkspace.slack.com/archives/C1234567890/p1609459200005500"
        actual_url = Task._build_web_url(slack_event_data)
        assert actual_url == expected_url

    def test_build_deep_link(self, slack_event_data):
        """Test deep link building functionality"""
        expected_link = f"slack://channel?team={slack_event_data['team_id']}&id={slack_event_data['channel']}&message={slack_event_data['ts']}"
        actual_link = Task._build_deep_link(slack_event_data)
        assert actual_link == expected_link

    def test_from_slack_event(self, slack_event_data):
        """Test factory method to create Task from Slack event"""
        task_text = "Review quarterly report"
        user_id = "user_123"
        
        task = Task.from_slack_event(
            event=slack_event_data,
            task_text=task_text,
            user_id=user_id
        )
        
        assert task.text == task_text
        assert task.source == "slack"
        assert task.slack_metadata is not None
        assert task.slack_metadata["channel_id"] == slack_event_data["channel"]
        assert task.slack_metadata["workspace_name"] == slack_event_data["team_name"]
        assert task.slack_metadata["sender_name"] == slack_event_data["user_name"]
        assert task.slack_metadata["original_text"] == slack_event_data["text"]
        
        # Verify URLs are built correctly
        assert "slack.com" in task.slack_metadata["message_url"]
        assert task.slack_metadata["deep_link"].startswith("slack://")
        
        # Verify task has valid ID
        assert task.id is not None
        assert len(task.id) > 0