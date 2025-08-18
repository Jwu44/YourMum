"""
Test cases for Bug #5: Task duplication in autogenerate schedule.

This test module specifically verifies the fix for duplicate tasks appearing 
when generating the next day's schedule from a source schedule containing 
incomplete tasks and recurring tasks.
"""

import pytest
import sys
import os
from unittest.mock import patch, MagicMock

# Ensure project root is on sys.path for 'backend' imports when running file directly
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.services.schedule_service import ScheduleService


class TestBug5TaskDeduplication:
    """Test cases for Bug #5 task deduplication logic."""

    @pytest.fixture
    def schedule_service(self):
        """Create a ScheduleService instance for testing."""
        with patch('backend.services.schedule_service.get_user_schedules_collection'):
            return ScheduleService()

    def test_deduplicate_tasks_removes_exact_duplicates(self, schedule_service):
        """Test that tasks with identical text are deduplicated."""
        tasks = [
            {
                'id': 'task1',
                'text': 'read fountainhead',
                'start_date': '2025-08-16',
                'completed': False,
                'is_recurring': {'frequency': 'daily'},
                'section': 'High Priority'
            },
            {
                'id': 'task2', 
                'text': 'read fountainhead',
                'start_date': '2025-08-15',
                'completed': False,
                'is_recurring': {'frequency': 'daily'},
                'section': None
            },
            {
                'id': 'task3',
                'text': 'different task',
                'start_date': '2025-08-16',
                'completed': False
            }
        ]
        
        result = schedule_service._deduplicate_tasks(tasks, '2025-08-16')
        
        # Should have 2 tasks: one 'read fountainhead' and one 'different task'
        assert len(result) == 2
        
        # Find the read fountainhead task
        fountainhead_task = next(t for t in result if t['text'] == 'read fountainhead')
        # Should prefer target date version (task1)
        assert fountainhead_task['id'] == 'task1'
        assert fountainhead_task['start_date'] == '2025-08-16'
        assert fountainhead_task['section'] == 'High Priority'  # Preserve section

    def test_deduplicate_tasks_prefers_calendar_events(self, schedule_service):
        """Test that calendar events take priority over manual tasks."""
        tasks = [
            {
                'id': 'manual1',
                'text': 'haircut',
                'start_date': '2025-08-16',
                'completed': False,
                'section': 'Medium Priority'
            },
            {
                'id': 'gcal1',
                'text': 'haircut', 
                'start_date': '2025-08-16',
                'completed': False,
                'gcal_event_id': '2oaa6k1uhi8fk1uqr2gka01t2h',
                'from_gcal': True,
                'end_time': '18:30',
                'start_time': '17:30'
            }
        ]
        
        result = schedule_service._deduplicate_tasks(tasks, '2025-08-16')
        
        # Should have 1 task, and it should be the calendar event
        assert len(result) == 1
        selected_task = result[0]
        assert selected_task['id'] == 'gcal1'
        assert selected_task['gcal_event_id'] == '2oaa6k1uhi8fk1uqr2gka01t2h'
        assert selected_task['from_gcal'] is True

    def test_deduplicate_tasks_prefers_target_date(self, schedule_service):
        """Test that target date instances take priority over carryover instances."""
        tasks = [
            {
                'id': 'carryover1',
                'text': 'implement rag',
                'start_date': '2025-08-15',  # Previous day
                'completed': False,
                'section': 'Medium Priority'
            },
            {
                'id': 'target1',
                'text': 'implement rag',
                'start_date': '2025-08-16',  # Target day
                'completed': False,
                'section': 'Medium Priority'
            }
        ]
        
        result = schedule_service._deduplicate_tasks(tasks, '2025-08-16')
        
        # Should have 1 task, and it should be the target date version
        assert len(result) == 1
        selected_task = result[0]
        assert selected_task['id'] == 'target1'
        assert selected_task['start_date'] == '2025-08-16'

    def test_deduplicate_tasks_preserves_sections(self, schedule_service):
        """Test that sections and tasks without text are preserved."""
        tasks = [
            {
                'id': 'section1',
                'text': 'High Priority',
                'is_section': True,
                'level': 0,
                'type': 'section'
            },
            {
                'id': 'task1',
                'text': '',  # Empty text
                'completed': False,
                'section': 'High Priority'
            },
            {
                'id': 'task2',
                'text': 'normal task',
                'completed': False,
                'section': 'High Priority'
            }
        ]
        
        result = schedule_service._deduplicate_tasks(tasks, '2025-08-16')
        
        # Should preserve all tasks since no duplicates by text
        assert len(result) == 3
        # Find section
        section = next(t for t in result if t.get('is_section'))
        assert section['text'] == 'High Priority'

    def test_bug5_scenario_exact_reproduction(self, schedule_service):
        """Test the exact Bug #5 scenario from the bug report."""
        # Simulating the tasks that would be combined before deduplication
        # This represents the final_tasks list before deduplication in autogenerate
        tasks_before_dedup = [
            # Sections
            {
                'id': '20adde01-4b2c-4028-a026-18d8798ff5b8',
                'text': 'High Priority',
                'is_section': True,
                'level': 0,
                'type': 'section'
            },
            # Calendar events (already in rebuilt)
            {
                'id': '6asjk4j70u0idrh1557i0idu2g_20250815T220000Z',
                'text': '🏃‍♂️Parkrun',
                'gcal_event_id': '6asjk4j70u0idrh1557i0idu2g_20250815T220000Z',
                'from_gcal': True,
                'start_date': '2025-08-16',
                'section': 'High Priority'
            },
            # Recurring tasks (new instances)
            {
                'id': 'eb5526b6-33aa-4e7c-9541-b035b63f8157',
                'text': 'read fountainhead',
                'is_recurring': {'dayOfWeek': 'Monday', 'frequency': 'daily'},
                'start_date': '2025-08-16',
                'completed': False
            },
            # Carryover tasks (including duplicates)
            {
                'id': '6f617be0-fbd3-4ec4-b911-40c3dbb27fd9',
                'text': 'read fountainhead',  # DUPLICATE
                'completed': False,
                'section': 'High Priority',
                'start_date': '2025-08-16'  # But from carryover
            },
            {
                'id': '2oaa6k1uhi8fk1uqr2gka01t2h',
                'text': 'haircut',
                'completed': False,
                'section': 'Medium Priority',
                'start_date': '2025-08-16'
            },
            # More calendar carryover duplicates
            {
                'id': '73099313-7eb4-469b-aacb-734906df5bb0',
                'text': 'haircut',  # DUPLICATE
                'completed': False,
                'section': 'Medium Priority',
                'start_date': '2025-08-16'
            }
        ]
        
        result = schedule_service._deduplicate_tasks(tasks_before_dedup, '2025-08-16')
        
        # Count tasks by text to verify deduplication
        task_texts = [t.get('text', '') for t in result if t.get('text') and not t.get('is_section')]
        unique_texts = set(task_texts)
        
        # Should have no duplicate task texts
        assert len(task_texts) == len(unique_texts), f"Found duplicates in: {task_texts}"
        
        # Verify specific tasks are present only once
        fountainhead_tasks = [t for t in result if t.get('text') == 'read fountainhead']
        haircut_tasks = [t for t in result if t.get('text') == 'haircut']
        
        assert len(fountainhead_tasks) == 1, "Should have exactly one 'read fountainhead' task"
        assert len(haircut_tasks) == 1, "Should have exactly one 'haircut' task"
        
        # Verify sections are preserved
        sections = [t for t in result if t.get('is_section')]
        assert len(sections) == 1
        assert sections[0]['text'] == 'High Priority'

    def test_select_best_duplicate_task_priority_rules(self, schedule_service):
        """Test the priority selection logic for duplicate tasks."""
        duplicates = [
            {
                'id': 'manual_old',
                'text': 'test task',
                'start_date': '2025-08-15',  # Carryover
                'section': 'Low Priority'
            },
            {
                'id': 'manual_new', 
                'text': 'test task',
                'start_date': '2025-08-16',  # Target date
                'section': 'High Priority'
            },
            {
                'id': 'gcal_old',
                'text': 'test task',
                'start_date': '2025-08-15',  # Carryover
                'gcal_event_id': 'gcal123',
                'from_gcal': True
            },
            {
                'id': 'gcal_new',
                'text': 'test task', 
                'start_date': '2025-08-16',  # Target date
                'gcal_event_id': 'gcal456',
                'from_gcal': True
            }
        ]
        
        result = schedule_service._select_best_duplicate_task(duplicates, '2025-08-16')
        
        # Should select calendar event with target date (highest priority)
        assert result['id'] == 'gcal_new'
        assert result['gcal_event_id'] == 'gcal456'
        assert result['start_date'] == '2025-08-16'

    def test_deduplication_handles_empty_and_malformed_tasks(self, schedule_service):
        """Test that deduplication handles edge cases gracefully."""
        tasks = [
            {},  # Empty task
            {'id': 'task1'},  # No text
            {'text': ''},  # Empty text
            {'text': '   '},  # Whitespace only
            {'id': 'task2', 'text': 'valid task', 'completed': False}
        ]
        
        result = schedule_service._deduplicate_tasks(tasks, '2025-08-16')
        
        # Should handle gracefully and return tasks without text plus valid tasks
        valid_tasks = [t for t in result if t.get('text', '').strip()]
        assert len(valid_tasks) == 1
        assert valid_tasks[0]['text'] == 'valid task'