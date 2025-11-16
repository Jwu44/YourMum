"""
Test Suite for Slack Task Positioning
Tests that Slack tasks are inserted at the correct position in the schedule
"""

import pytest
import os
from datetime import datetime
from unittest.mock import Mock, MagicMock

from backend.services.slack_service import SlackService
from backend.models.task import Task
from backend.models.schedule_schema import format_schedule_date


class TestSlackTaskPositioning:
    """Test cases for Slack task insertion positioning"""

    @pytest.fixture
    def slack_service_env_vars(self, monkeypatch):
        """Set up Slack environment variables for testing"""
        monkeypatch.setenv('SLACK_CLIENT_ID', 'test_client_id')
        monkeypatch.setenv('SLACK_CLIENT_SECRET', 'test_client_secret')
        monkeypatch.setenv('SLACK_SIGNING_SECRET', 'test_signing_secret')
        monkeypatch.setenv('SLACK_APP_ID', 'test_app_id')

    @pytest.fixture
    def mock_db_client(self):
        """Mock database client with realistic behavior"""
        mock_db = Mock()
        mock_collection = Mock()

        # Store for tracking update_one calls
        mock_collection.update_calls = []

        # Mock update_one to capture calls
        def capture_update_one(filter_query, update_pipeline, **kwargs):
            mock_collection.update_calls.append({
                'filter': filter_query,
                'pipeline': update_pipeline,
                'kwargs': kwargs
            })
            return Mock(matched_count=1, modified_count=1)

        mock_collection.update_one = Mock(side_effect=capture_update_one)
        mock_db.get_collection.return_value = mock_collection

        return mock_db

    @pytest.fixture
    def sample_slack_task(self):
        """Create a sample Slack task"""
        event = {
            'type': 'message',
            'text': 'Review the quarterly report',
            'channel': 'C123456',
            'user': 'U123456',
            'ts': '1234567890.123456',
            'team_id': 'T123456',
            'channel_name': 'general',
            'user_name': 'john.doe'
        }

        task = Task.from_slack_event(
            event=event,
            task_text='Review the quarterly report',
            user_id='test_user_123'
        )

        return task

    def test_slack_task_insert_uses_aggregation_pipeline(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that _store_task uses MongoDB aggregation pipeline"""
        service = SlackService(db_client=mock_db_client)

        # Call _store_task
        service._store_task(sample_slack_task, 'test_user_123')

        # Get the collection and verify it was called
        mock_collection = mock_db_client.get_collection.return_value

        # Verify update_one was called
        assert len(mock_collection.update_calls) == 1

        call = mock_collection.update_calls[0]

        # Verify filter query
        assert 'userId' in call['filter']
        assert call['filter']['userId'] == 'test_user_123'
        assert 'date' in call['filter']

        # Verify aggregation pipeline (list format, not dict)
        pipeline = call['pipeline']
        assert isinstance(pipeline, list), "Update should use aggregation pipeline (list)"
        assert len(pipeline) > 0

        # Verify upsert is enabled
        assert call['kwargs'].get('upsert') is True

    def test_slack_task_pipeline_has_set_operation(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that pipeline contains $set operation for schedule array"""
        service = SlackService(db_client=mock_db_client)
        service._store_task(sample_slack_task, 'test_user_123')

        mock_collection = mock_db_client.get_collection.return_value
        call = mock_collection.update_calls[0]
        pipeline = call['pipeline']

        # First stage should be $set
        assert '$set' in pipeline[0]

        # $set should contain schedule field
        assert 'schedule' in pipeline[0]['$set']

        # $set should contain metadata.last_modified field
        assert 'metadata.last_modified' in pipeline[0]['$set']

    def test_slack_task_pipeline_uses_let_and_cond(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that pipeline uses $let and $cond for conditional insertion"""
        service = SlackService(db_client=mock_db_client)
        service._store_task(sample_slack_task, 'test_user_123')

        mock_collection = mock_db_client.get_collection.return_value
        call = mock_collection.update_calls[0]
        pipeline = call['pipeline']

        schedule_expr = pipeline[0]['$set']['schedule']

        # Should use $let for variable binding
        assert '$let' in schedule_expr
        assert 'vars' in schedule_expr['$let']
        assert 'firstSectionIndex' in schedule_expr['$let']['vars']

        # Should use $indexOfArray to find first section
        assert '$indexOfArray' in schedule_expr['$let']['vars']['firstSectionIndex']

        # Should use $cond for conditional logic
        assert 'in' in schedule_expr['$let']
        assert '$cond' in schedule_expr['$let']['in']

    def test_slack_task_pipeline_handles_no_sections(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that pipeline has logic for no sections case (insert at top)"""
        service = SlackService(db_client=mock_db_client)
        service._store_task(sample_slack_task, 'test_user_123')

        mock_collection = mock_db_client.get_collection.return_value
        call = mock_collection.update_calls[0]
        pipeline = call['pipeline']

        cond_expr = pipeline[0]['$set']['schedule']['$let']['in']['$cond']

        # Should check if firstSectionIndex == -1 (no sections)
        assert 'if' in cond_expr
        assert '$eq' in cond_expr['if']

        # 'then' branch should concat task at beginning
        assert 'then' in cond_expr
        assert '$concatArrays' in cond_expr['then']

    def test_slack_task_pipeline_handles_sections_exist(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that pipeline has logic for sections case (insert after first)"""
        service = SlackService(db_client=mock_db_client)
        service._store_task(sample_slack_task, 'test_user_123')

        mock_collection = mock_db_client.get_collection.return_value
        call = mock_collection.update_calls[0]
        pipeline = call['pipeline']

        cond_expr = pipeline[0]['$set']['schedule']['$let']['in']['$cond']

        # 'else' branch should slice array and insert after first section
        assert 'else' in cond_expr
        assert '$concatArrays' in cond_expr['else']

        # Should have 3 parts: before section, new task, after section
        concat_parts = cond_expr['else']['$concatArrays']
        assert len(concat_parts) == 3

    def test_slack_task_date_formatting(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that date is formatted correctly for storage"""
        service = SlackService(db_client=mock_db_client)
        service._store_task(sample_slack_task, 'test_user_123')

        mock_collection = mock_db_client.get_collection.return_value
        call = mock_collection.update_calls[0]

        # Get expected formatted date
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        expected_date = format_schedule_date(today_str)

        # Verify date in filter
        assert call['filter']['date'] == expected_date

    def test_slack_task_metadata_timestamp(
        self,
        slack_service_env_vars,
        mock_db_client,
        sample_slack_task
    ):
        """Test that metadata timestamp is set"""
        service = SlackService(db_client=mock_db_client)
        service._store_task(sample_slack_task, 'test_user_123')

        mock_collection = mock_db_client.get_collection.return_value
        call = mock_collection.update_calls[0]
        pipeline = call['pipeline']

        # Verify metadata.last_modified exists
        assert 'metadata.last_modified' in pipeline[0]['$set']

        # Verify it's a timestamp string
        timestamp = pipeline[0]['$set']['metadata.last_modified']
        assert isinstance(timestamp, str)
        assert 'T' in timestamp  # ISO format

    def test_slack_task_handles_missing_db_client(
        self,
        slack_service_env_vars,
        sample_slack_task
    ):
        """Test that _store_task handles missing db_client gracefully"""
        service = SlackService(db_client=None)

        # Should not raise exception
        service._store_task(sample_slack_task, 'test_user_123')

        # No assertion needed - just verify no exception


class TestSlackTaskPositioningDocumentation:
    """Documentation tests to verify implementation details"""

    @pytest.fixture
    def slack_service_env_vars(self, monkeypatch):
        """Set up Slack environment variables for testing"""
        monkeypatch.setenv('SLACK_CLIENT_ID', 'test_client_id')
        monkeypatch.setenv('SLACK_CLIENT_SECRET', 'test_client_secret')
        monkeypatch.setenv('SLACK_SIGNING_SECRET', 'test_signing_secret')
        monkeypatch.setenv('SLACK_APP_ID', 'test_app_id')

    def test_store_task_docstring_exists(self, slack_service_env_vars):
        """Test that _store_task has comprehensive docstring"""
        service = SlackService()

        # Verify docstring exists
        assert service._store_task.__doc__ is not None

        docstring = service._store_task.__doc__

        # Verify docstring mentions key implementation details
        assert 'atomic' in docstring.lower()
        assert 'section' in docstring.lower()
        assert 'mongodb' in docstring.lower() or 'aggregation' in docstring.lower()

    def test_store_task_prevents_race_conditions(self, slack_service_env_vars):
        """Documentation test: verify race condition prevention is mentioned"""
        service = SlackService()
        docstring = service._store_task.__doc__

        # Verify race condition handling is documented
        assert 'race' in docstring.lower() or 'atomic' in docstring.lower()
