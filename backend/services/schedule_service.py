"""
Schedule Service Module

Centralized service for handling schedule operations including creation, retrieval,
updates, and validation. Provides a clean abstraction layer between API routes
and database operations.
"""

from typing import Dict, List, Any, Optional, Tuple
import traceback

from backend.db_config import get_user_schedules_collection
from backend.models.schedule_schema import (
    validate_schedule_document, 
    format_schedule_date, 
    format_timestamp
)
from backend.services.schedule_gen import generate_schedule


class ScheduleService:
    """
    Service class for managing schedule operations with proper error handling
    and business logic separation.
    """

    def __init__(self):
        """Initialize the schedule service."""
        self.schedules_collection = get_user_schedules_collection()

    def create_or_update_schedule(
        self, 
        user_id: str, 
        form_data: Dict[str, Any], 
        date: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create a new schedule or update existing one using AI service.
        
        Args:
            user_id: User's Google ID or Firebase UID
            form_data: Form data from frontend containing user preferences and tasks
            date: Optional date string (YYYY-MM-DD), defaults to today
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            # Use provided date or default to today
            schedule_date = format_schedule_date(date)
            
            # Check if schedule already exists
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": schedule_date
            })

            # Generate schedule using AI service
            schedule_result = generate_schedule({
                **form_data,
                'user_id': user_id,
                'tasks': form_data.get('tasks', [])
            })
            
            if not schedule_result or not schedule_result.get('tasks'):
                return False, {"error": "Failed to generate schedule"}

            # Prepare schedule document
            schedule_document = self._build_schedule_document(
                user_id=user_id,
                date=schedule_date,
                tasks=schedule_result['tasks'],
                form_data=form_data,
                source="ai_service"
            )

            # Validate document against schema
            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}

            # Store or update schedule
            if existing_schedule:
                success, schedule_id = self._update_existing_schedule(
                    existing_schedule["_id"], 
                    schedule_document
                )
            else:
                success, schedule_id = self._create_new_schedule(schedule_document)

            if not success:
                return False, {"error": "Failed to store schedule"}

            # Calculate and return metadata
            metadata = self._calculate_schedule_metadata(schedule_result['tasks'])
            
            return True, {
                "schedule": schedule_result['tasks'],
                "scheduleId": str(schedule_id),
                "metadata": metadata
            }

        except Exception as e:
            print(f"Error in create_or_update_schedule: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def get_schedule_by_date(
        self, 
        user_id: str, 
        date: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Retrieve an existing schedule for a specific date.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            # Format date for database query
            formatted_date = format_schedule_date(date)
            
            # Find schedule in database
            schedule_doc = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })

            if not schedule_doc:
                return False, {"error": "No schedule found for this date"}

            # Extract schedule data (use 'schedule' field only)
            schedule_tasks = schedule_doc.get('schedule', [])
            metadata_doc = schedule_doc.get('metadata', {})
            
            # Calculate current metadata
            metadata = self._calculate_schedule_metadata(schedule_tasks)
            metadata.update({
                "generatedAt": metadata_doc.get('created_at', ''),
                "lastModified": metadata_doc.get('last_modified', ''),
                "source": metadata_doc.get('source', 'unknown')
            })

            return True, {
                "schedule": schedule_tasks,
                "date": date,
                "metadata": metadata
            }

        except Exception as e:
            print(f"Error in get_schedule_by_date: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def update_schedule_tasks(
        self, 
        user_id: str, 
        date: str, 
        tasks: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Update an existing schedule with new tasks.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            tasks: List of task objects to update the schedule with
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            updated schedule data on success or error message on failure
        """
        try:
            # Format date for database query
            formatted_date = format_schedule_date(date)
            
            # Check if schedule exists
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })

            if not existing_schedule:
                return False, {"error": "No existing schedule found for this date"}

            # Validate updated document structure
            temp_doc = {
                **existing_schedule,
                "schedule": tasks,
                "metadata": {
                    **existing_schedule.get('metadata', {}),
                    "last_modified": format_timestamp(),
                    "source": "manual"
                }
            }
            
            is_valid, validation_error = validate_schedule_document(temp_doc)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}

            # Update the schedule
            result = self.schedules_collection.update_one(
                {"_id": existing_schedule["_id"]},
                {
                    "$set": {
                        "schedule": tasks,
                        "metadata.last_modified": format_timestamp(),
                        "metadata.source": "manual"
                    }
                }
            )

            if result.modified_count == 0:
                return False, {"error": "Failed to update schedule"}

            # Calculate metadata
            metadata = self._calculate_schedule_metadata(tasks)
            metadata.update({
                "generatedAt": existing_schedule.get('metadata', {}).get('created_at', ''),
                "lastModified": format_timestamp(),
                "source": "manual"
            })

            return True, {
                "schedule": tasks,
                "date": date,
                "metadata": metadata
            }

        except Exception as e:
            print(f"Error in update_schedule_tasks: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def _build_schedule_document(
        self, 
        user_id: str, 
        date: str, 
        tasks: List[Dict[str, Any]], 
        form_data: Dict[str, Any],
        source: str = "ai_service"
    ) -> Dict[str, Any]:
        """
        Build a complete schedule document following the schema.
        
        Args:
            user_id: User identifier
            date: Formatted date string
            tasks: List of task objects
            form_data: Original form data
            source: Source of the schedule creation
            
        Returns:
            Complete schedule document ready for database storage
        """
        return {
            "userId": user_id,
            "date": date,
            "schedule": tasks,  # Source of truth
            "inputs": {
                "name": form_data.get('name', ''),
                "work_start_time": form_data.get('work_start_time', ''),
                "work_end_time": form_data.get('work_end_time', ''),
                "working_days": form_data.get('working_days', []),
                "energy_patterns": form_data.get('energy_patterns', []),
                "priorities": form_data.get('priorities', {}),
                "layout_preference": form_data.get('layout_preference', {}),
                "tasks": form_data.get('tasks', [])
            },
            "metadata": {
                "created_at": format_timestamp(),
                "last_modified": format_timestamp(),
                "source": source
            }
        }

    def _update_existing_schedule(
        self, 
        schedule_id: Any, 
        schedule_document: Dict[str, Any]
    ) -> Tuple[bool, Any]:
        """
        Update an existing schedule document.
        
        Args:
            schedule_id: MongoDB ObjectId of existing schedule
            schedule_document: New schedule document data
            
        Returns:
            Tuple of (success: bool, schedule_id: Any)
        """
        try:
            result = self.schedules_collection.update_one(
                {"_id": schedule_id},
                {
                    "$set": {
                        "schedule": schedule_document["schedule"],
                        "inputs": schedule_document["inputs"],
                        "metadata.last_modified": format_timestamp(),
                        "metadata.source": schedule_document["metadata"]["source"]
                    }
                }
            )
            return result.modified_count > 0, schedule_id
        except Exception as e:
            print(f"Error updating schedule: {e}")
            return False, None

    def _create_new_schedule(
        self, 
        schedule_document: Dict[str, Any]
    ) -> Tuple[bool, Any]:
        """
        Create a new schedule document.
        
        Args:
            schedule_document: Complete schedule document
            
        Returns:
            Tuple of (success: bool, schedule_id: Any)
        """
        try:
            result = self.schedules_collection.insert_one(schedule_document)
            return bool(result.inserted_id), result.inserted_id
        except Exception as e:
            print(f"Error creating schedule: {e}")
            return False, None

    def _calculate_schedule_metadata(
        self, 
        tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate metadata from task list.
        
        Args:
            tasks: List of task objects
            
        Returns:
            Dictionary containing calculated metadata
        """
        non_section_tasks = [t for t in tasks if not t.get('is_section', False)]
        calendar_events = [t for t in tasks if t.get('gcal_event_id')]
        recurring_tasks = [t for t in tasks if t.get('is_recurring')]

        return {
            "totalTasks": len(non_section_tasks),
            "calendarEvents": len(calendar_events),
            "recurringTasks": len(recurring_tasks),
            "generatedAt": format_timestamp()
        }

    def create_empty_schedule(self, user_id: str, date: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Create an empty schedule document for a user on a specific date.
        """
        try:
            # 1. Format date properly
            formatted_date = format_schedule_date(date)
            
            # 2. Check for existing schedule (prevents duplicates)
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })

            if existing_schedule:
                return False, {"error": "Schedule already exists for this date"}

            # 3. Create schema-compliant empty document
            schedule_document = {
                "userId": user_id,
                "date": formatted_date,
                "schedule": [],  # Empty task array
                "inputs": {
                    "name": "",
                    "work_start_time": "",
                    "work_end_time": "",
                    "working_days": [],
                    "energy_patterns": [],
                    "priorities": {},
                    "layout_preference": {},
                    "tasks": []
                },
                "metadata": {
                    "created_at": format_timestamp(),
                    "last_modified": format_timestamp(),
                    "source": "manual"
                }
            }
            
            # 4. Validate against schema
            is_valid, error_message = validate_schedule_document(schedule_document)

            if not is_valid:
                return False, {"error": f"Schedule validation failed: {error_message}"}

            # 5. Insert into database
            result = self.schedules_collection.insert_one(schedule_document)
            
            return True, {
                "schedule": [],
                "scheduleId": str(result.inserted_id),
                "metadata": {
                    "totalTasks": 0,
                    "calendarEvents": 0,
                    "recurringTasks": 0,
                    "generatedAt": format_timestamp()
                }
            }

        except Exception as e:
            # Comprehensive error handling
            return False, {"error": f"Failed to create empty schedule: {str(e)}"}


# Create a singleton instance for use across the application
schedule_service = ScheduleService()