from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.db_config import get_database
import traceback

def get_archive_collection():
    """Get the Archive collection from the database."""
    db = get_database()
    return db['Archive']

def archive_task(user_id: str, task_data: Dict[str, Any], original_date: str) -> Dict[str, Any]:
    """
    Archive a task for a user.
    
    Args:
        user_id: The user's Google ID
        task_data: Complete task object data
        original_date: Original schedule date (YYYY-MM-DD format)
        
    Returns:
        Dict with success status and any error messages
    """
    try:
        collection = get_archive_collection()
        
        # Create archived task entry
        archived_task_entry = {
            'taskId': task_data['id'],
            'archivedAt': datetime.now(timezone.utc),
            'task': task_data,
            'originalDate': original_date
        }
        
        # Check if user already has an archive document
        existing_archive = collection.find_one({'userId': user_id})
        
        if existing_archive:
            # Add to existing archive
            result = collection.update_one(
                {'userId': user_id},
                {
                    '$push': {'archivedTasks': archived_task_entry},
                    '$set': {'lastModified': datetime.now(timezone.utc)}
                }
            )
            
            if result.modified_count > 0:
                return {
                    'success': True,
                    'message': 'Task archived successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to archive task'
                }
        else:
            # Create new archive document
            new_archive = {
                'userId': user_id,
                'archivedTasks': [archived_task_entry],
                'lastModified': datetime.now(timezone.utc)
            }
            
            result = collection.update_one(
                {'userId': user_id},
                {'$set': new_archive},
                upsert=True
            )
            
            if result.upserted_id or result.modified_count > 0:
                return {
                    'success': True,
                    'message': 'Task archived successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to create archive'
                }
        
    except Exception as e:
        print(f"Error archiving task: {e}")
        traceback.print_exc()
        return {
            'success': False,
            'error': f'Database error: {str(e)}'
        }

def get_archived_tasks(user_id: str) -> Dict[str, Any]:
    """
    Get all archived tasks for a user, sorted chronologically (newest first).
    
    Args:
        user_id: The user's Google ID
        
    Returns:
        Dict with success status and archived tasks list
    """
    try:
        collection = get_archive_collection()
        
        # Find user's archive document
        archive_doc = collection.find_one({'userId': user_id})
        
        if not archive_doc or 'archivedTasks' not in archive_doc:
            return {
                'success': True,
                'archivedTasks': []
            }
        
        # Sort tasks by archivedAt date (newest first)
        archived_tasks = archive_doc['archivedTasks']
        sorted_tasks = sorted(
            archived_tasks,
            key=lambda task: task.get('archivedAt', datetime.min.replace(tzinfo=timezone.utc)),
            reverse=True
        )
        
        return {
            'success': True,
            'archivedTasks': sorted_tasks
        }
        
    except Exception as e:
        print(f"Error getting archived tasks: {e}")
        traceback.print_exc()
        return {
            'success': False,
            'error': f'Database error: {str(e)}',
            'archivedTasks': []
        }

def move_archived_task_to_today(user_id: str, task_id: str) -> Dict[str, Any]:
    """
    Move an archived task back to today's schedule and remove from archive.
    
    Args:
        user_id: The user's Google ID
        task_id: The ID of the task to move
        
    Returns:
        Dict with success status and task data if successful
    """
    try:
        collection = get_archive_collection()
        
        # Find user's archive document
        archive_doc = collection.find_one({'userId': user_id})
        
        if not archive_doc or 'archivedTasks' not in archive_doc:
            return {
                'success': False,
                'error': 'No archive found for user'
            }
        
        # Find the specific task in the archive
        task_to_move = None
        for archived_task in archive_doc['archivedTasks']:
            if archived_task.get('taskId') == task_id:
                task_to_move = archived_task
                break
        
        if not task_to_move:
            return {
                'success': False,
                'error': 'Task not found in archive'
            }
        
        # Remove the task from archive
        result = collection.update_one(
            {'userId': user_id},
            {
                '$pull': {'archivedTasks': {'taskId': task_id}},
                '$set': {'lastModified': datetime.now(timezone.utc)}
            }
        )
        
        if result.modified_count > 0:
            # Update task data for today's date
            task_data = task_to_move['task'].copy()
            today_date = datetime.now().strftime('%Y-%m-%d')
            task_data['start_date'] = today_date
            
            return {
                'success': True,
                'task': task_data,
                'message': 'Task moved to today successfully'
            }
        else:
            return {
                'success': False,
                'error': 'Failed to remove task from archive'
            }
        
    except Exception as e:
        print(f"Error moving archived task: {e}")
        traceback.print_exc()
        return {
            'success': False,
            'error': f'Database error: {str(e)}'
        }

def delete_archived_task(user_id: str, task_id: str) -> Dict[str, Any]:
    """
    Permanently delete an archived task.
    
    Args:
        user_id: The user's Google ID
        task_id: The ID of the task to delete
        
    Returns:
        Dict with success status and any error messages
    """
    try:
        collection = get_archive_collection()
        
        # Remove the task from archive
        result = collection.update_one(
            {'userId': user_id},
            {
                '$pull': {'archivedTasks': {'taskId': task_id}},
                '$set': {'lastModified': datetime.now(timezone.utc)}
            }
        )
        
        if result.modified_count > 0:
            return {
                'success': True,
                'message': 'Archived task deleted successfully'
            }
        else:
            return {
                'success': False,
                'error': 'Task not found in archive or failed to delete'
            }
        
    except Exception as e:
        print(f"Error deleting archived task: {e}")
        traceback.print_exc()
        return {
            'success': False,
            'error': f'Database error: {str(e)}'
        } 