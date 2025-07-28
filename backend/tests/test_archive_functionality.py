import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from backend.models.task import Task
from backend.db_config import get_database
import uuid

class TestArchiveFunctionality(unittest.TestCase):
    """Test suite for archive functionality following TDD principles."""

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.mock_db = MagicMock()
        self.mock_collection = MagicMock()
        self.test_user_id = "test-user-123"
        self.test_date = "2024-01-15"
        
        # Create sample task for testing
        self.sample_task = Task(
            id="task-123",
            text="Sample task to archive",
            categories=["Work"],
            start_time="10:00",
            end_time="11:00",
            start_date=self.test_date
        )

    @patch('backend.db_config.get_database')
    def test_archive_task_creates_new_archive_document(self, mock_get_db):
        """Test archiving a task creates a new archive document if user has no archive."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        self.mock_collection.find_one.return_value = None  # No existing archive
        self.mock_collection.update_one.return_value.upserted_id = "new-archive-id"
        
        from backend.services.archive_service import archive_task
        
        # Execute
        result = archive_task(self.test_user_id, self.sample_task.to_dict(), self.test_date)
        
        # Verify
        self.assertTrue(result['success'])
        self.mock_collection.update_one.assert_called_once()
        
        # Check the upsert operation was called with correct structure
        call_args = self.mock_collection.update_one.call_args
        filter_query = call_args[0][0]
        update_query = call_args[0][1]
        
        self.assertEqual(filter_query['userId'], self.test_user_id)
        self.assertIn('$push', update_query)
        self.assertIn('archivedTasks', update_query['$push'])

    @patch('backend.db_config.get_database')
    def test_archive_task_adds_to_existing_archive(self, mock_get_db):
        """Test archiving a task adds to existing archive document."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        
        existing_archive = {
            'userId': self.test_user_id,
            'archivedTasks': [
                {
                    'taskId': 'old-task-123',
                    'archivedAt': datetime.now(timezone.utc),
                    'task': {'id': 'old-task-123', 'text': 'Old task'},
                    'originalDate': '2024-01-10'
                }
            ]
        }
        self.mock_collection.find_one.return_value = existing_archive
        self.mock_collection.update_one.return_value.modified_count = 1
        
        from backend.services.archive_service import archive_task
        
        # Execute
        result = archive_task(self.test_user_id, self.sample_task.to_dict(), self.test_date)
        
        # Verify
        self.assertTrue(result['success'])
        self.mock_collection.update_one.assert_called_once()

    @patch('backend.db_config.get_database')
    def test_get_archived_tasks_returns_chronological_list(self, mock_get_db):
        """Test getting archived tasks returns them in chronological order (newest first)."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        
        archived_tasks = [
            {
                'taskId': 'task-1',
                'archivedAt': datetime(2024, 1, 10, 10, 0, 0, tzinfo=timezone.utc),
                'task': {'id': 'task-1', 'text': 'Older task'},
                'originalDate': '2024-01-10'
            },
            {
                'taskId': 'task-2', 
                'archivedAt': datetime(2024, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
                'task': {'id': 'task-2', 'text': 'Newer task'},
                'originalDate': '2024-01-15'
            }
        ]
        
        archive_doc = {
            'userId': self.test_user_id,
            'archivedTasks': archived_tasks
        }
        self.mock_collection.find_one.return_value = archive_doc
        
        from backend.services.archive_service import get_archived_tasks
        
        # Execute
        result = get_archived_tasks(self.test_user_id)
        
        # Verify
        self.assertTrue(result['success'])
        self.assertEqual(len(result['archivedTasks']), 2)
        # Should be sorted by archivedAt desc (newest first)
        self.assertEqual(result['archivedTasks'][0]['task']['text'], 'Newer task')
        self.assertEqual(result['archivedTasks'][1]['task']['text'], 'Older task')

    @patch('backend.db_config.get_database')
    def test_get_archived_tasks_returns_empty_for_no_archive(self, mock_get_db):
        """Test getting archived tasks returns empty list when user has no archive."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        self.mock_collection.find_one.return_value = None
        
        from backend.services.archive_service import get_archived_tasks
        
        # Execute
        result = get_archived_tasks(self.test_user_id)
        
        # Verify
        self.assertTrue(result['success'])
        self.assertEqual(result['archivedTasks'], [])

    @patch('backend.db_config.get_database')
    def test_move_archived_task_to_today_removes_from_archive(self, mock_get_db):
        """Test moving an archived task to today removes it from archive and returns task data."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        
        archived_task = {
            'taskId': 'task-123',
            'archivedAt': datetime.now(timezone.utc),
            'task': self.sample_task.to_dict(),
            'originalDate': self.test_date
        }
        
        archive_doc = {
            'userId': self.test_user_id,
            'archivedTasks': [archived_task]
        }
        self.mock_collection.find_one.return_value = archive_doc
        self.mock_collection.update_one.return_value.modified_count = 1
        
        from backend.services.archive_service import move_archived_task_to_today
        
        # Execute
        result = move_archived_task_to_today(self.test_user_id, 'task-123')
        
        # Verify
        self.assertTrue(result['success'])
        self.assertEqual(result['task']['id'], 'task-123')
        self.mock_collection.update_one.assert_called_once()
        
        # Verify the pull operation was called to remove the task
        call_args = self.mock_collection.update_one.call_args
        update_query = call_args[0][1]
        self.assertIn('$pull', update_query)

    @patch('backend.db_config.get_database')
    def test_delete_archived_task_removes_from_archive(self, mock_get_db):
        """Test deleting an archived task permanently removes it from archive."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        self.mock_collection.update_one.return_value.modified_count = 1
        
        from backend.services.archive_service import delete_archived_task
        
        # Execute
        result = delete_archived_task(self.test_user_id, 'task-123')
        
        # Verify
        self.assertTrue(result['success'])
        self.mock_collection.update_one.assert_called_once()
        
        # Verify the pull operation was called
        call_args = self.mock_collection.update_one.call_args
        update_query = call_args[0][1]
        self.assertIn('$pull', update_query)

    @patch('backend.db_config.get_database')
    def test_archive_task_handles_database_errors(self, mock_get_db):
        """Test archive task handles database errors gracefully."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        self.mock_collection.find_one.side_effect = Exception("Database error")
        
        from backend.services.archive_service import archive_task
        
        # Execute
        result = archive_task(self.test_user_id, self.sample_task.to_dict(), self.test_date)
        
        # Verify
        self.assertFalse(result['success'])
        self.assertIn('error', result)

    @patch('backend.db_config.get_database')
    def test_move_task_not_found_in_archive(self, mock_get_db):
        """Test moving a task that doesn't exist in archive returns error."""
        # Setup
        mock_get_db.return_value = self.mock_db
        self.mock_db.__getitem__.return_value = self.mock_collection
        
        archive_doc = {
            'userId': self.test_user_id,
            'archivedTasks': []  # Empty archive
        }
        self.mock_collection.find_one.return_value = archive_doc
        
        from backend.services.archive_service import move_archived_task_to_today
        
        # Execute
        result = move_archived_task_to_today(self.test_user_id, 'nonexistent-task')
        
        # Verify
        self.assertFalse(result['success'])
        self.assertIn('not found', result['error'])

if __name__ == '__main__':
    unittest.main() 