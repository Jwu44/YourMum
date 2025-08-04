"""
Test Suite for Task 22: Enhanced Empty Schedule Creation
Tests the new functionality that creates schedules with sections, recurring tasks, and inputs from last valid schedule
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from bson import ObjectId

# Import the Flask app and services
from backend.apis.routes import api_bp
from backend.services.schedule_service import ScheduleService
from backend.db_config import get_user_schedules_collection


class TestTask22EnhancedEmptySchedule:
    """Test cases for Task 22 enhanced empty schedule creation"""

    @pytest.fixture
    def mock_user_schedules_collection(self):
        """Mock user schedules collection"""
        mock_collection = Mock()
        return mock_collection

    @pytest.fixture
    def sample_recent_schedule(self):
        """Sample recent schedule with inputs config and sections"""
        return {
            "userId": "test_user_123",
            "date": "2025-01-15T00:00:00Z",
            "schedule": [
                {
                    "id": "section_morning",
                    "text": "Morning",
                    "is_section": True,
                    "completed": False,
                    "level": 0,
                    "section_index": 0,
                    "type": "section"
                },
                {
                    "id": "section_afternoon",
                    "text": "Afternoon", 
                    "is_section": True,
                    "completed": False,
                    "level": 0,
                    "section_index": 1,
                    "type": "section"
                },
                {
                    "id": "section_evening",
                    "text": "Evening",
                    "is_section": True,
                    "completed": False,
                    "level": 0,
                    "section_index": 2,
                    "type": "section"
                },
                {
                    "id": "recurring_task_1",
                    "text": "Daily workout",
                    "is_recurring": {
                        "frequency": "daily"
                    },
                    "completed": False,
                    "is_section": False
                },
                {
                    "id": "weekly_task_1", 
                    "text": "Team meeting",
                    "is_recurring": {
                        "frequency": "weekly",
                        "dayOfWeek": "Monday"
                    },
                    "completed": False,
                    "is_section": False
                }
            ],
            "inputs": {
                "name": "Test User",
                "work_start_time": "09:00",
                "work_end_time": "17:00",
                "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "energy_patterns": ["morning_person"],
                "priorities": {
                    "health": "Exercise daily",
                    "relationships": "Call family"
                },
                "layout_preference": {
                    "layout": "todolist-structured",
                    "subcategory": "day-sections",
                    "orderingPattern": "timebox"
                },
                "tasks": []
            }
        }

    def test_get_most_recent_schedule_with_inputs(
        self, 
        mock_user_schedules_collection,
        sample_recent_schedule
    ):
        """Test finding most recent schedule with input config"""
        
        # Mock database calls - first call returns None, second returns recent schedule
        mock_user_schedules_collection.find_one.side_effect = [None, sample_recent_schedule]
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_user_schedules_collection
        
        # Test finding recent schedule
        result = schedule_service._get_most_recent_schedule_with_inputs(
            user_id="test_user_123",
            target_date="2025-01-16",
            max_days_back=5
        )
        
        # Verify result contains the recent schedule
        assert result is not None
        assert result['userId'] == "test_user_123"
        assert 'inputs' in result
        assert result['inputs']['name'] == "Test User"
        assert result['inputs']['layout_preference']['subcategory'] == "day-sections"

    def test_create_sections_from_config(self):
        """Test creating section tasks from layout preference"""
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        
        # Test day-sections layout
        layout_preference = {
            "layout": "todolist-structured",
            "subcategory": "day-sections",
            "orderingPattern": "timebox"
        }
        
        sections = schedule_service._create_sections_from_config(layout_preference)
        
        # Verify sections were created
        assert len(sections) == 3
        assert all(section['is_section'] is True for section in sections)
        assert all(section['type'] == 'section' for section in sections)
        
        section_texts = [s['text'] for s in sections]
        assert "Morning" in section_texts
        assert "Afternoon" in section_texts
        assert "Evening" in section_texts

    def test_copy_sections_from_schedule(self, sample_recent_schedule):
        """Test copying section tasks from an existing schedule"""
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        
        # Test copying sections from recent schedule
        sections = schedule_service._copy_sections_from_schedule(sample_recent_schedule)
        
        # Verify sections were copied
        assert len(sections) == 3
        assert all(section['is_section'] is True for section in sections)
        assert all(section['type'] == 'section' for section in sections)
        
        section_texts = [s['text'] for s in sections]
        assert "Morning" in section_texts
        assert "Afternoon" in section_texts
        assert "Evening" in section_texts
        
        # Verify new IDs were generated
        original_ids = {task['id'] for task in sample_recent_schedule['schedule'] if task.get('is_section')}
        copied_ids = {section['id'] for section in sections}
        assert len(original_ids.intersection(copied_ids)) == 0  # No overlap in IDs

    def test_should_task_recur_on_date_daily(self):
        """Test daily recurring task logic"""
        
        schedule_service = ScheduleService()
        
        # Test daily recurring task
        daily_task = {
            "text": "Daily workout",
            "is_recurring": {
                "frequency": "daily"
            }
        }
        
        target_date = datetime(2025, 1, 16)  # Any date
        result = schedule_service._should_task_recur_on_date(daily_task, target_date)
        
        assert result is True

    def test_should_task_recur_on_date_weekly(self):
        """Test weekly recurring task logic"""
        
        schedule_service = ScheduleService()
        
        # Test weekly recurring task (Monday)
        weekly_task = {
            "text": "Team meeting",
            "is_recurring": {
                "frequency": "weekly",
                "dayOfWeek": "Monday"
            }
        }
        
        # Test on Monday (2025-01-06 is a Monday)
        monday_date = datetime(2025, 1, 6)
        result = schedule_service._should_task_recur_on_date(weekly_task, monday_date)
        assert result is True
        
        # Test on Tuesday
        tuesday_date = datetime(2025, 1, 7)
        result = schedule_service._should_task_recur_on_date(weekly_task, tuesday_date)
        assert result is False

    def test_enhanced_empty_schedule_creation_integration(
        self,
        mock_user_schedules_collection,
        sample_recent_schedule
    ):
        """Test the full enhanced empty schedule creation"""
        
        # Mock database operations
        mock_result = Mock()
        mock_result.upserted_id = ObjectId()
        mock_user_schedules_collection.replace_one.return_value = mock_result
        
        # Mock finding recent schedule with inputs
        # Need to provide enough responses for all the database calls:
        # 1. Initial check for target date (None)
        # 2. Search for recent schedule with inputs (returns sample_recent_schedule)
        # 3-32. Search for recurring tasks (30 days back, returns sample_recent_schedule for first few, then None)
        mock_responses = [None, sample_recent_schedule] + [sample_recent_schedule] * 5 + [None] * 25
        mock_user_schedules_collection.find_one.side_effect = mock_responses
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_user_schedules_collection
        
        # Test creating enhanced empty schedule for Monday (should get weekly task)
        user_id = "test_user_123"
        date = "2025-01-06"  # Monday
        
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=date,
            tasks=[]
        )
        
        # Verify success
        assert success is True
        assert result['date'] == date
        assert 'schedule' in result
        
        # Verify schedule contains sections and recurring tasks
        schedule_tasks = result['schedule']
        
        # Should have sections (Morning, Afternoon, Evening) + recurring tasks
        section_tasks = [t for t in schedule_tasks if t.get('is_section')]
        recurring_tasks = [t for t in schedule_tasks if t.get('is_recurring')]
        
        assert len(section_tasks) == 3  # Day sections
        assert len(recurring_tasks) >= 1  # At least the daily task should recur
        
        # Verify section names
        section_names = [s['text'] for s in section_tasks]
        assert "Morning" in section_names
        assert "Afternoon" in section_names
        assert "Evening" in section_names

    def test_enhanced_empty_schedule_fallback_behavior(
        self,
        mock_user_schedules_collection
    ):
        """Test fallback to normal empty schedule when no recent schedule exists"""
        
        # Mock database operations - no recent schedules found
        mock_result = Mock()
        mock_result.upserted_id = ObjectId()
        mock_user_schedules_collection.replace_one.return_value = mock_result
        mock_user_schedules_collection.find_one.return_value = None  # Always return None
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_user_schedules_collection
        
        # Test creating empty schedule with no recent data
        user_id = "test_user_123"
        date = "2025-01-16"
        
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=date,
            tasks=[]
        )
        
        # Verify success with empty schedule
        assert success is True
        assert result['date'] == date
        assert result['schedule'] == []  # Should be empty when no recent data