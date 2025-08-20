"""
Schedule Service Module

Centralized service for handling all schedule operations including creation,
retrieval, updates, and validation. Provides a clean abstraction layer between 
API routes and database operations.

All schedule creation operations are centralized here for consistency and 
to eliminate code duplication across API routes.
"""

from typing import Dict, List, Any, Tuple, Optional
import traceback
import uuid
from datetime import datetime, timedelta

from backend.db_config import get_user_schedules_collection
from backend.services.schedule_gen import generate_local_sections
from backend.models.schedule_schema import (
    validate_schedule_document, 
    format_schedule_date, 
    format_timestamp
)
import backend.services.calendar_service as calendar_service


class ScheduleService:
    """
    Service class for managing schedule operations with proper error handling
    and business logic separation.
    
    Centralizes all schedule CRUD operations to eliminate duplication across API routes.
    """

    def __init__(self):
        """Initialize the schedule service."""
        self.schedules_collection = get_user_schedules_collection()

    def _get_calendar_fetch_timeout(self) -> float:
        """Sub-timeout in seconds for calendar fetch; override in tests if needed."""
        return 10.0

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

            inputs = schedule_doc.get('inputs', {})
            return True, {
                "schedule": schedule_tasks,
                "date": date,
                "metadata": metadata,
                "inputs": inputs
            }

        except Exception as e:
            print(f"Error in get_schedule_by_date: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def create_schedule_from_ai_generation(
        self,
        user_id: str,
        date: str,
        generated_tasks: List[Dict[str, Any]],
        inputs: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create or replace a schedule from AI generation with full input context.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            generated_tasks: List of AI-generated task objects
            inputs: Full user input data used for generation
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            # Process inputs with safe defaults
            processed_inputs = self._process_schedule_inputs(inputs)
            
            # Create schedule document using centralized helper
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=generated_tasks,
                source="ai_service",
                inputs=processed_inputs
            )
            
            # Validate document before storage
            is_valid, error_msg, validated_document = self._validate_and_prepare_schedule_document(
                schedule_document, user_id, date
            )
            if not is_valid:
                return False, {"error": error_msg}
            schedule_document = validated_document
            
            # Replace existing schedule or create new one (upsert)
            formatted_date = format_schedule_date(date)
            result = self.schedules_collection.replace_one(
                {"userId": user_id, "date": formatted_date},
                schedule_document,
                upsert=True
            )
            
            # Calculate and return response metadata
            metadata = self._calculate_schedule_metadata(generated_tasks)
            metadata.update({
                "generatedAt": schedule_document["metadata"]["created_at"],
                "lastModified": schedule_document["metadata"]["last_modified"],
                "source": "ai_service"
            })
            
            return True, {
                "schedule": generated_tasks,
                "date": date,
                "scheduleId": str(result.upserted_id) if result.upserted_id else "updated",
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error in create_schedule_from_ai_generation: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to create AI-generated schedule: {str(e)}"}

    def create_schedule_from_calendar_sync(
        self,
        user_id: str,
        date: str,
        calendar_tasks: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create initial schedule from Google Calendar for first-time users.
        This method focuses on initial schedule creation only.
        If a schedule already exists, delegates to apply_calendar_webhook_update for proper position preservation.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            calendar_tasks: List of calendar task objects to sync
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            formatted_date = format_schedule_date(date)
            
            # Check if schedule exists - delegate to webhook handler if it does
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })
            
            if existing_schedule:
                # Delegate to webhook method for proper position preservation
                return self.apply_calendar_webhook_update(user_id, date, calendar_tasks)
            
            # Create new schedule with calendar tasks only (first-time user flow)
            new_calendar_tasks = self._normalize_calendar_tasks(calendar_tasks, date)
            
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=new_calendar_tasks,
                source="calendar_sync"
            )
            
            # Add calendar-specific metadata
            schedule_document["metadata"].update({
                "calendarSynced": True,
                "calendarEvents": len(new_calendar_tasks)
            })
            
            # Validate and insert
            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}
            
            self.schedules_collection.insert_one(schedule_document)
            
            # Calculate metadata for response
            metadata = self._calculate_schedule_metadata(new_calendar_tasks)
            metadata.update({
                "generatedAt": format_timestamp(),
                "lastModified": format_timestamp(),
                "source": "calendar_sync",
                "calendarSynced": True,
                "calendarEvents": len(new_calendar_tasks)
            })
            
            return True, {
                "schedule": new_calendar_tasks,
                "date": date,
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error in create_schedule_from_calendar_sync: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to sync calendar schedule: {str(e)}"}

    def apply_calendar_webhook_update(
        self,
        user_id: str,
        date: str,
        calendar_tasks: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Merge calendar events for webhook/SSE updates with a preservation-first strategy:
        - Keep all existing calendar tasks (completed and incomplete) unless explicitly updated by fetch
        - Upsert fetched events by gcal_event_id, preserving local completion and ID, updating Google fields
        - Skip fetched events lacking gcal_event_id to avoid duplication
        - Leave schedule untouched if fetched set is empty (non-destructive)

        This logic is intentionally scoped to webhook/SSE updates and differs from
        create_schedule_from_calendar_sync which is used for other sync paths.
        """
        try:
            formatted_date = format_schedule_date(date)

            # Load existing schedule (required for webhook behavior)
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })

            existing_tasks: List[Dict[str, Any]] = existing_schedule.get('schedule', []) if existing_schedule else []
            non_calendar_tasks = self._filter_non_calendar_tasks(existing_tasks)
            existing_calendar_tasks = self._filter_calendar_tasks(existing_tasks)

            # If incoming list is empty, return current state non-destructively
            # Filter out tasks without gcal_event_id to avoid duplicates
            tasks_with_gcal_id = [task for task in calendar_tasks if task.get('gcal_event_id')]
            normalized_incoming = self._normalize_calendar_tasks(tasks_with_gcal_id, date)

            # Remove problematic early return - let all cases flow through robust position preservation logic

            # Use helper methods consistently for all webhook scenarios

            # Use consolidated upsert logic
            upserted_calendar = self._upsert_calendar_tasks_by_id(
                existing_calendar_tasks,
                normalized_incoming,
                date
            )
            
            fetched_id_set = {task.get('gcal_event_id') for task in normalized_incoming if task.get('gcal_event_id')}

            # Use consolidated position preservation logic
            rebuilt = self._rebuild_tasks_preserving_calendar_positions(
                existing_tasks,
                upserted_calendar,
                fetched_id_set
            )

            # Deduplicate in-place while preserving order of the rebuilt list
            try:
                incoming_texts_lc = {
                    (t.get('text') or '').strip().lower()
                    for t in upserted_calendar
                }
                incoming_ids = {
                    t.get('gcal_event_id')
                    for t in upserted_calendar
                    if t.get('gcal_event_id')
                }

                filtered_rebuilt: List[Dict[str, Any]] = []
                for t in rebuilt:
                    if not t.get('from_gcal', False):
                        # Keep sections and any explicit section types
                        if t.get('is_section', False) or t.get('type') == 'section':
                            filtered_rebuilt.append(t)
                            continue
                        task_text_lc = (t.get('text') or '').strip().lower()
                        task_id = t.get('id')
                        if task_text_lc in incoming_texts_lc or (task_id and task_id in incoming_ids):
                            # Drop manual duplicate of incoming calendar event
                            continue
                    filtered_rebuilt.append(t)

                final_tasks = filtered_rebuilt
            except Exception:
                # Safety fallback: if dedup fails, keep rebuilt order
                final_tasks = rebuilt

            # Prepare update doc and validate
            if existing_schedule:
                existing_metadata = existing_schedule.get('metadata', {})
                update_doc = {
                    "schedule": final_tasks,
                    "metadata": {
                        **existing_metadata,
                        "last_modified": format_timestamp(),
                        "calendarSynced": True,
                        "calendarEvents": len([t for t in final_tasks if t.get('from_gcal', False)]),
                        "source": "calendar_sync"
                    }
                }

                temp_doc = {**existing_schedule, **update_doc}
                temp_doc["date"] = formatted_date
                is_valid, validation_error = validate_schedule_document(temp_doc)
                if not is_valid:
                    return False, {"error": f"Schedule validation failed: {validation_error}"}

                self.schedules_collection.update_one(
                    {"userId": user_id, "date": formatted_date},
                    {"$set": update_doc}
                )

            else:
                # No existing schedule for date → create one with calendar tasks only
                schedule_document = self._create_schedule_document(
                    user_id=user_id,
                    date=date,
                    tasks=final_tasks,
                    source="calendar_sync"
                )
                is_valid, validation_error = validate_schedule_document(schedule_document)
                if not is_valid:
                    return False, {"error": f"Schedule validation failed: {validation_error}"}
                self.schedules_collection.insert_one(schedule_document)

            metadata = self._calculate_schedule_metadata(final_tasks)
            metadata.update({
                "generatedAt": format_timestamp(),
                "lastModified": format_timestamp(),
                "source": "calendar_sync",
                "calendarSynced": True,
                "calendarEvents": len([t for t in final_tasks if t.get('from_gcal', False)])
            })

            return True, {"schedule": final_tasks, "date": date, "metadata": metadata}
        except Exception as e:
            print(f"Error in apply_calendar_webhook_update: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to apply webhook calendar update: {str(e)}"}

    def create_empty_schedule(
        self,
        user_id: str,
        date: str,
        tasks: Optional[List[Dict[str, Any]]] = None,
        inputs: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create an enhanced empty schedule with sections, recurring tasks, and inputs from last valid schedule.
        
        This method now implements the full logic for Task 22:
        1. Gets inputs config from most recent schedule with valid inputs
        2. Creates sections from layout preference if they exist
        3. Adds recurring tasks that should occur on the target date
        4. Maintains backwards compatibility with simple empty schedule creation
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            tasks: Optional list of initial task objects (defaults to empty list)
            inputs: Optional user input data for schedule generation context
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            print(f"Creating enhanced empty schedule for {date}")
            
            # Step 1: Start with provided tasks or empty list
            enhanced_tasks = list(tasks) if tasks else []
            
            # Step 2: Always get most recent schedule (needed for sections and inputs)
            recent_schedule = self._get_most_recent_schedule_with_inputs(user_id, date)
            
            # Use inputs from recent schedule if not provided
            if not inputs:
                if recent_schedule:
                    inputs = recent_schedule.get('inputs', {})
                    print(f"Using inputs from recent schedule")
                else:
                    print("No recent schedule with inputs found, using default empty inputs")
            
            # Step 3: Copy existing sections from most recent schedule if available
            section_tasks = []
            if recent_schedule:
                existing_sections = self._copy_sections_from_schedule(recent_schedule)
                section_tasks = existing_sections
                print(f"Copied {len(section_tasks)} section tasks from recent schedule")
            elif inputs and inputs.get('layout_preference'):
                # Fallback: create sections from layout preference if no recent sections found
                layout_preference = inputs.get('layout_preference', {})
                if layout_preference.get('layout') == 'todolist-structured':
                    section_tasks = self._create_sections_from_config(layout_preference)
                    print(f"Created {len(section_tasks)} section tasks from layout config")
            
            # Step 4: Find recurring tasks for this date
            recurring_tasks = self._get_recurring_tasks_for_date(user_id, date)
            
            # Step 5: Combine all tasks in order: sections first, then recurring tasks, then any provided tasks
            final_tasks = section_tasks + recurring_tasks + enhanced_tasks
            
            print(f"Final schedule has: {len(section_tasks)} sections, {len(recurring_tasks)} recurring tasks, {len(enhanced_tasks)} initial tasks")
            
            # Step 6: Create schedule document using centralized helper
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=final_tasks,
                source="manual",
                inputs=inputs
            )
            
            # Validate document before storage
            is_valid, error_msg, validated_document = self._validate_and_prepare_schedule_document(
                schedule_document, user_id, date
            )
            if not is_valid:
                return False, {"error": error_msg}
            schedule_document = validated_document
            
            # Replace existing schedule or create new one (upsert)
            formatted_date = format_schedule_date(date)
            result = self.schedules_collection.replace_one(
                {"userId": user_id, "date": formatted_date},
                schedule_document,
                upsert=True
            )
            
            # Calculate response metadata
            metadata = self._calculate_schedule_metadata(final_tasks)
            metadata.update({
                "generatedAt": schedule_document["metadata"]["created_at"],
                "lastModified": schedule_document["metadata"]["last_modified"],
                "source": "manual"
            })
            
            return True, {
                "schedule": final_tasks,
                "date": date,
                "scheduleId": str(result.upserted_id) if result.upserted_id else "updated",
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error in create_empty_schedule: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to create enhanced empty schedule: {str(e)}"}

    def update_schedule_tasks(
        self, 
        user_id: str, 
        date: str, 
        tasks: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Update an existing schedule with new tasks, or create if it doesn't exist.
        Now implements upsert behavior for seamless manual task addition.
        
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

            if existing_schedule:
                # Update existing schedule
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
            else:
                # No existing schedule - create new one using create_empty_schedule logic
                return self.create_empty_schedule(user_id, date, tasks)

        except Exception as e:
            print(f"Error in update_schedule_tasks: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def get_most_recent_schedule_with_tasks(
        self,
        user_id: str,
        before_date: str,
        max_days_back: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Find the most recent schedule (strictly before before_date) that has at least one
        non-section task. Schedules containing only Google Calendar events still count as
        having tasks, as long as they are non-section tasks.

        Args:
            user_id: User's Google ID or Firebase UID
            before_date: Date string in YYYY-MM-DD format to search backwards from
            max_days_back: Maximum number of days to search backwards (default 30)

        Returns:
            The schedule document if found, otherwise None
        """
        try:
            target_dt = datetime.strptime(before_date, '%Y-%m-%d')

            for days_back in range(1, max_days_back + 1):
                search_dt = target_dt - timedelta(days=days_back)
                formatted_date = format_schedule_date(search_dt.strftime('%Y-%m-%d'))

                schedule_doc = self.schedules_collection.find_one({
                    "userId": user_id,
                    "date": formatted_date
                })

                if not schedule_doc:
                    continue

                tasks = schedule_doc.get('schedule', [])
                non_section = [t for t in tasks if not t.get('is_section', False) and t.get('type') != 'section']
                if len(non_section) > 0:
                    return schedule_doc

            return None
        except Exception as e:
            print(f"Error in get_most_recent_schedule_with_tasks: {str(e)}")
            traceback.print_exc()
            return None

    def autogenerate_schedule(
        self,
        user_id: str,
        date: str,
        max_days_back: int = 30,
        user_timezone: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Autogenerate a schedule for the given date by:
        - If schedule for the date exists: return existed=True
        - Else, find most recent schedule with ≥1 non-section task within max_days_back
          (calendar-only schedules qualify). If none, return sourceFound=False.
        - Build today's schedule by:
            - Including all sections (new IDs)
            - Including incomplete non-recurring tasks (new IDs), excluding calendar-origin tasks
            - Including recurring tasks that should occur on the target date (new IDs)
            - Setting start_date of included tasks to target date
          Reuse inputs from the most recent schedule with inputs.

        Returns tuple (success, result_dict)
        """
        try:
            # If schedule already exists, no-op
            exists, existing = self.get_schedule_by_date(user_id, date)
            if exists:
                return True, {
                    "existed": True,
                    "created": False,
                    "sourceFound": True,
                    "date": date,
                    "schedule": existing.get('schedule', [])
                }

            # Find source schedule
            source_schedule = self.get_most_recent_schedule_with_tasks(user_id, date, max_days_back)
            if not source_schedule:
                return True, {
                    "existed": False,
                    "created": False,
                    "sourceFound": False,
                    "date": date,
                    "schedule": []
                }

            # Build new tasks
            section_tasks = self._copy_sections_from_schedule(source_schedule)
            first_section_text: Optional[str] = None
            if section_tasks:
                try:
                    first_section = section_tasks[0]
                    first_section_text = first_section.get('text') or None
                except Exception:
                    first_section_text = None

            # Incomplete tasks from source (including incomplete recurring tasks)
            source_tasks = source_schedule.get('schedule', [])
            carry_over_tasks: List[Dict[str, Any]] = []
            carry_over_calendar_tasks: List[Dict[str, Any]] = []
            carried_over_recurring_texts: set = set()  # Track carried over recurring tasks
            for task in source_tasks:
                if task.get('is_section', False) or task.get('type') == 'section':
                    continue
                if task.get('completed', False):
                    continue
                # Separate handling for calendar-origin vs manual tasks
                if task.get('from_gcal', False) or task.get('gcal_event_id'):
                    # Carry-over INCOMPLETE Google Calendar tasks to next day per spec
                    calendar_copy = {**task}
                    calendar_copy['id'] = str(uuid.uuid4())
                    calendar_copy['start_date'] = date  # keep times, move date
                    if 'type' not in calendar_copy:
                        calendar_copy['type'] = 'task'
                    # Ensure flags
                    calendar_copy['from_gcal'] = True
                    carry_over_calendar_tasks.append(calendar_copy)
                else:
                    new_task = {**task}
                    new_task['id'] = str(uuid.uuid4())
                    new_task['start_date'] = date
                    if 'type' not in new_task:
                        new_task['type'] = 'task'
                    carry_over_tasks.append(new_task)
                    
                    # Track if this is a recurring task being carried over
                    if task.get('is_recurring'):
                        carried_over_recurring_texts.add(task.get('text', ''))

            # Recurring tasks due on target date (exclude ones already carried over)
            recurring_tasks = self._get_recurring_tasks_for_date(user_id, date, exclude_texts=carried_over_recurring_texts)

            # Fetch calendar tasks for target date with sub-timeout to respect 10s UX
            fetched_calendar_tasks: List[Dict[str, Any]] = []
            try:
                # Allow tests to override fetch timeout via method
                timeout_seconds = self._get_calendar_fetch_timeout()
            except Exception:
                timeout_seconds = 8.0

            try:
                from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

                def _fetch():
                    return calendar_service.get_calendar_tasks_for_user_date(
                        user_id,
                        date,
                        timezone_override=user_timezone
                    )

                with ThreadPoolExecutor(max_workers=2) as executor:
                    future = executor.submit(_fetch)
                    try:
                        fetched_calendar_tasks = future.result(timeout=timeout_seconds)
                    except FuturesTimeout:
                        # Proceed without calendar on timeout
                        fetched_calendar_tasks = []
                    except Exception:
                        fetched_calendar_tasks = []
            except Exception:
                # Fallback to direct fetch without timeout (still protected)
                try:
                    fetched_calendar_tasks = calendar_service.get_calendar_tasks_for_user_date(
                        user_id,
                        date,
                        timezone_override=user_timezone
                    )
                except Exception:
                    fetched_calendar_tasks = []

            # Preserve relative positions from source schedule when placing today's calendar events.
            # Build map of source calendar tasks by gcal_event_id
            source_calendar_map: Dict[str, Dict[str, Any]] = {}
            for t in source_tasks:
                if t.get('from_gcal', False) and t.get('gcal_event_id'):
                    source_calendar_map[t['gcal_event_id']] = t

            fetched_by_id: Dict[str, Dict[str, Any]] = {t.get('gcal_event_id'): t for t in fetched_calendar_tasks if t.get('gcal_event_id')}
            fetched_ids = set(fetched_by_id.keys())

            # Rebuild from source order: replace existing calendar items with today's updates
            # Filter out completed tasks from the source schedule when rebuilding
            rebuilt: List[Dict[str, Any]] = []
            last_calendar_index = -1
            for item in source_tasks:
                if item.get('is_section', False) or item.get('type') == 'section':
                    rebuilt.append(item)
                    continue
                # Skip completed tasks from source schedule
                if item.get('completed', False):
                    continue
                # Skip recurring tasks from rebuilt (they're handled by carry-over logic)
                if item.get('is_recurring'):
                    continue
                if item.get('from_gcal', False):
                    gid = item.get('gcal_event_id')
                    if gid and gid in fetched_by_id:
                        updated = dict(fetched_by_id[gid])
                        updated['from_gcal'] = True
                        # Preserve section of the source item
                        if item.get('section') and not updated.get('section'):
                            updated['section'] = item.get('section')
                        rebuilt.append(updated)
                        last_calendar_index = len(rebuilt) - 1
                    else:
                        # If not fetched today and was calendar, carry-over logic already handled separately
                        # Do not duplicate here
                        pass
                else:
                    rebuilt.append(item)

            # Insert brand-new fetched calendar events after last calendar index, inheriting nearby section
            insertion_index = last_calendar_index + 1 if last_calendar_index >= 0 else (1 if section_tasks else 0)
            inherited_section: Optional[str] = None
            if insertion_index > 0 and insertion_index <= len(rebuilt):
                prev = rebuilt[insertion_index - 1]
                inherited_section = prev.get('section') if not prev.get('is_section', False) else prev.get('text')

            new_ids_in_order = [gid for gid in fetched_ids if gid not in source_calendar_map]
            new_items = []
            for gid in new_ids_in_order:
                ni = dict(fetched_by_id[gid])
                ni['from_gcal'] = True
                if inherited_section and not ni.get('section'):
                    ni['section'] = inherited_section
                new_items.append(ni)
            if new_items:
                # Sort new calendar items by time before inserting
                sorted_new_items = self._sort_calendar_block(new_items)
                rebuilt = rebuilt[:insertion_index] + sorted_new_items + rebuilt[insertion_index:]

            # Filter carry_over_calendar_tasks to exclude events already handled in rebuilt section
            filtered_carry_over_calendar = []
            for carry_task in carry_over_calendar_tasks:
                carry_gcal_id = carry_task.get('gcal_event_id')
                # Only include if this event was not fetched for today (i.e., not in fetched_ids)
                if carry_gcal_id and carry_gcal_id not in fetched_ids:
                    filtered_carry_over_calendar.append(carry_task)

            # After placing calendar items, append recurring and carry-over tasks at the end
            final_tasks: List[Dict[str, Any]] = rebuilt + recurring_tasks + carry_over_tasks + filtered_carry_over_calendar

            # Deduplicate tasks to fix Bug #5: prevent duplicate tasks when generating next day schedule
            final_tasks = self._deduplicate_tasks(final_tasks, date)

            # Inputs from most recent schedule with inputs
            recent_with_inputs = self._get_most_recent_schedule_with_inputs(user_id, date)
            inputs = recent_with_inputs.get('inputs', {}) if recent_with_inputs else {}

            # Create and upsert document (use source='manual' to satisfy schema)
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=final_tasks,
                source="manual",
                inputs=inputs
            )

            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}

            formatted_date = format_schedule_date(date)
            result = self.schedules_collection.replace_one(
                {"userId": user_id, "date": formatted_date},
                schedule_document,
                upsert=True
            )

            metadata = self._calculate_schedule_metadata(final_tasks)
            metadata.update({
                "generatedAt": schedule_document["metadata"]["created_at"],
                "lastModified": schedule_document["metadata"]["last_modified"],
                "source": "manual"
            })

            return True, {
                "existed": False,
                "created": True,
                "sourceFound": True,
                "date": date,
                "schedule": final_tasks,
                "metadata": metadata
            }
        except Exception as e:
            print(f"Error in autogenerate_schedule: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to autogenerate schedule: {str(e)}"}

    def _create_schedule_document(
        self,
        user_id: str,
        date: str,
        tasks: List[Dict[str, Any]],
        source: str,
        inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Internal helper method to create consistent schedule documents.
        Centralizes document structure creation to eliminate duplication.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            tasks: List of task objects for the schedule
            source: Source of schedule creation ("ai_service", "calendar", "manual")
            inputs: Optional user input data (defaults to empty structure)
            
        Returns:
            Complete schedule document ready for database storage
        """
        # Format date consistently
        formatted_date = format_schedule_date(date)
        
        # Prepare default inputs structure if not provided
        default_inputs = {
            "name": "",
            "work_start_time": "",
            "work_end_time": "",
            "energy_patterns": [],
            "priorities": {},
            "layout_preference": {},
            "tasks": []
        }
        
        # Use provided inputs or defaults
        document_inputs = inputs if inputs is not None else default_inputs
        
        # Create consistent document structure
        return {
            "userId": user_id,
            "date": formatted_date,
            "schedule": tasks,
            "inputs": document_inputs,
            "metadata": {
                "created_at": format_timestamp(),
                "last_modified": format_timestamp(),
                "source": source
            }
        }

    def _get_most_recent_schedule_with_inputs(
        self, 
        user_id: str, 
        target_date: str, 
        max_days_back: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Find the most recent schedule that has non-empty input config data.
        Searches backwards from target date up to max_days_back days.
        
        Args:
            user_id: User's Google ID or Firebase UID
            target_date: Date string in YYYY-MM-DD format to search backwards from
            max_days_back: Maximum number of days to search backwards (default 30)
            
        Returns:
            Schedule document with inputs config, or None if not found
        """
        try:
            target_dt = datetime.strptime(target_date, '%Y-%m-%d')
            
            # Search backwards day by day
            for days_back in range(1, max_days_back + 1):
                search_date = target_dt - timedelta(days=days_back)
                formatted_date = format_schedule_date(search_date.strftime('%Y-%m-%d'))
                
                schedule_doc = self.schedules_collection.find_one({
                    "userId": user_id,
                    "date": formatted_date
                })
                
                if schedule_doc:
                    inputs = schedule_doc.get('inputs', {})
                    # Check if inputs has meaningful data (not empty or default)
                    if inputs and any([
                        inputs.get('name'),
                        inputs.get('work_start_time'),
                        inputs.get('layout_preference', {}).get('layout')
                    ]):
                        print(f"Found recent schedule with inputs from {search_date.strftime('%Y-%m-%d')}")
                        return schedule_doc
                        
            print(f"No recent schedule with inputs found within {max_days_back} days")
            return None
            
        except Exception as e:
            print(f"Error finding recent schedule with inputs: {str(e)}")
            traceback.print_exc()
            return None

    def _sort_calendar_block(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sort calendar tasks as a contiguous block: all-day first, then by start_time (HH:MM),
        tie-break by text alphabetically. Returns a new sorted list.
        """
        try:
            def sort_key(t: Dict[str, Any]):
                start_time = t.get('start_time')
                text = (t.get('text') or '').lower()
                return (0 if not start_time else 1, start_time or '', text)

            return sorted(tasks, key=sort_key)
        except Exception:
            return tasks

    def _create_sections_from_config(self, layout_preference: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create empty section tasks from layout preference configuration.
        
        Args:
            layout_preference: Layout configuration from inputs
            
        Returns:
            List of section task objects
        """
        try:
            # Generate section names using existing logic
            section_names = generate_local_sections(layout_preference)
            section_tasks = []
            
            for index, section_name in enumerate(section_names):
                section_task = {
                    "id": str(uuid.uuid4()),
                    "text": section_name,
                    "categories": [],
                    "is_section": True,
                    "completed": False,
                    "is_subtask": False,
                    "section": None,
                    "parent_id": None,
                    "level": 0,
                    "section_index": index,
                    "type": "section"
                }
                section_tasks.append(section_task)
                
            return section_tasks
            
        except Exception as e:
            print(f"Error creating sections from config: {str(e)}")
            return []

    def _copy_sections_from_schedule(self, schedule_doc: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Copy section tasks from an existing schedule document.
        Creates new section tasks with fresh IDs but preserves section structure.
        
        Args:
            schedule_doc: Schedule document containing existing sections
            
        Returns:
            List of section task objects copied from the schedule
        """
        try:
            existing_tasks = schedule_doc.get('schedule', [])
            section_tasks = []
            
            # Find all section tasks in the existing schedule
            for task in existing_tasks:
                if task.get('is_section', False) or task.get('type') == 'section':
                    # Create a copy of the section with a new ID
                    section_copy = {
                        "id": str(uuid.uuid4()),  # New ID for new date
                        "text": task.get('text', ''),
                        "categories": task.get('categories', []),
                        "is_section": True,
                        "completed": False,
                        "is_subtask": False,
                        "section": None,
                        "parent_id": None,
                        "level": task.get('level', 0),
                        "section_index": task.get('section_index', len(section_tasks)),
                        "type": "section"
                    }
                    section_tasks.append(section_copy)
                    
            return section_tasks
            
        except Exception as e:
            print(f"Error copying sections from schedule: {str(e)}")
            return []

    def _get_recurring_tasks_for_date(
        self, 
        user_id: str, 
        target_date: str, 
        max_days_back: int = 30,
        exclude_texts: set = None
    ) -> List[Dict[str, Any]]:
        """
        Find all recurring tasks that should occur on the target date.
        Searches through recent schedules to find recurring tasks.
        
        Args:
            user_id: User's Google ID or Firebase UID
            target_date: Date string in YYYY-MM-DD format
            max_days_back: Maximum number of days to search back for recurring tasks
            exclude_texts: Set of task texts to exclude (for tasks already carried over)
            
        Returns:
            List of recurring task objects that should occur on target date
        """
        try:
            target_dt = datetime.strptime(target_date, '%Y-%m-%d')
            recurring_tasks = []
            seen_task_texts = set()  # Prevent duplicates
            exclude_texts = exclude_texts or set()  # Default to empty set if None
            
            # Search backwards through recent schedules
            for days_back in range(1, max_days_back + 1):
                search_date = target_dt - timedelta(days=days_back)
                formatted_date = format_schedule_date(search_date.strftime('%Y-%m-%d'))
                
                schedule_doc = self.schedules_collection.find_one({
                    "userId": user_id,
                    "date": formatted_date
                })
                
                if schedule_doc:
                    schedule_tasks = schedule_doc.get('schedule', [])
                    
                    # Check each task for recurrence
                    for task in schedule_tasks:
                        task_text = task.get('text', '')
                        if (task.get('is_recurring') and 
                            not task.get('is_section', False) and
                            task_text not in seen_task_texts and
                            task_text not in exclude_texts):
                            
                            if self._should_task_recur_on_date(task, target_dt):
                                # Create a copy of the task for the new date
                                recurring_task = {
                                    **task,
                                    "id": str(uuid.uuid4()),  # New ID for new date
                                    "start_date": target_date,
                                    "completed": False  # Reset completion status
                                }
                                recurring_tasks.append(recurring_task)
                                seen_task_texts.add(task_text)
                                
            print(f"Found {len(recurring_tasks)} recurring tasks for {target_date}")
            return recurring_tasks
            
        except Exception as e:
            print(f"Error finding recurring tasks: {str(e)}")
            traceback.print_exc()
            return []

    def _should_task_recur_on_date(self, task: Dict[str, Any], target_date: datetime) -> bool:
        """
        Check if a recurring task should occur on the target date.
        Based on the frontend shouldTaskRecurOnDate logic.
        
        Args:
            task: Task object with recurrence information
            target_date: Target date as datetime object
            
        Returns:
            Boolean indicating if task should recur on target date
        """
        try:
            is_recurring = task.get('is_recurring')
            if not is_recurring or not isinstance(is_recurring, dict):
                return False
                
            frequency = is_recurring.get('frequency')
            
            if frequency == 'daily':
                return True
                
            elif frequency == 'weekly':
                day_of_week = is_recurring.get('dayOfWeek')
                if not day_of_week:
                    return False
                target_day_name = target_date.strftime('%A')  # Monday, Tuesday, etc.
                return target_day_name == day_of_week
                
            elif frequency == 'monthly':
                day_of_week = is_recurring.get('dayOfWeek')
                week_of_month = is_recurring.get('weekOfMonth')
                if not day_of_week or not week_of_month:
                    return False
                    
                target_day_name = target_date.strftime('%A')
                target_week_of_month = self._get_week_of_month(target_date)
                
                return (target_day_name == day_of_week and 
                        target_week_of_month == week_of_month)
                        
            return False
            
        except Exception as e:
            print(f"Error checking task recurrence: {str(e)}")
            return False

    def _get_week_of_month(self, date: datetime) -> str:
        """
        Get which week of the month a date falls in.
        
        Args:
            date: Date to check
            
        Returns:
            Week identifier: 'first', 'second', 'third', 'fourth', or 'last'
        """
        day_of_month = date.day
        
        if 1 <= day_of_month <= 7:
            return 'first'
        elif 8 <= day_of_month <= 14:
            return 'second'
        elif 15 <= day_of_month <= 21:
            return 'third'
        elif 22 <= day_of_month <= 28:
            return 'fourth'
        else:
            # Days 29-31 are considered 'last' week
            return 'last'

    def _deduplicate_tasks(
        self, 
        tasks: List[Dict[str, Any]], 
        target_date: str
    ) -> List[Dict[str, Any]]:
        """
        Deduplicate tasks based on text content, applying priority rules:
        1. Calendar events (with gcal_event_id) take priority over manual tasks
        2. Target date instances take priority over carryover instances
        3. Preserve section assignments from the selected version
        
        Args:
            tasks: List of tasks that may contain duplicates
            target_date: Target date string for prioritization
            
        Returns:
            List of deduplicated tasks
        """
        try:
            if not tasks:
                return []
                
            # Group tasks by text content
            task_groups: Dict[str, List[Dict[str, Any]]] = {}
            for task in tasks:
                task_text = task.get('text', '').strip()
                if not task_text:
                    continue  # Skip tasks without text
                    
                if task_text not in task_groups:
                    task_groups[task_text] = []
                task_groups[task_text].append(task)
            
            deduplicated = []
            
            for task_text, duplicate_tasks in task_groups.items():
                if len(duplicate_tasks) == 1:
                    # No duplicates, keep the single task
                    deduplicated.append(duplicate_tasks[0])
                    continue
                
                # Apply priority rules to select the best task
                selected_task = self._select_best_duplicate_task(duplicate_tasks, target_date)
                deduplicated.append(selected_task)
            
            # Add tasks without text (sections, etc.) that weren't grouped
            for task in tasks:
                task_text = task.get('text', '').strip()
                if not task_text:
                    deduplicated.append(task)
            
            print(f"Deduplication: {len(tasks)} tasks -> {len(deduplicated)} tasks")
            return deduplicated
            
        except Exception as e:
            print(f"Error in task deduplication: {str(e)}")
            traceback.print_exc()
            # Return original tasks if deduplication fails
            return tasks

    def _select_best_duplicate_task(
        self, 
        duplicate_tasks: List[Dict[str, Any]], 
        target_date: str
    ) -> Dict[str, Any]:
        """
        Select the best task from a group of duplicates based on priority rules.
        
        Args:
            duplicate_tasks: List of tasks with the same text
            target_date: Target date string for prioritization
            
        Returns:
            The selected task with highest priority
        """
        try:
            # Priority 1: Calendar events (with gcal_event_id) over manual tasks
            calendar_tasks = [t for t in duplicate_tasks if t.get('gcal_event_id')]
            manual_tasks = [t for t in duplicate_tasks if not t.get('gcal_event_id')]
            
            # Prefer calendar tasks if available
            candidates = calendar_tasks if calendar_tasks else manual_tasks
            
            # Priority 2: Target date instances over carryover instances
            target_date_tasks = [t for t in candidates if t.get('start_date') == target_date]
            
            if target_date_tasks:
                # If multiple target date tasks, prefer calendar events
                final_candidates = [t for t in target_date_tasks if t.get('gcal_event_id')]
                if not final_candidates:
                    final_candidates = target_date_tasks
                return final_candidates[0]  # Take first if multiple remain
            else:
                # No target date tasks, take first candidate
                return candidates[0]
                
        except Exception as e:
            print(f"Error selecting best duplicate task: {str(e)}")
            # Return first task as fallback
            return duplicate_tasks[0]

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
        non_section_tasks = self._filter_non_section_tasks(tasks)
        calendar_events = [t for t in tasks if t.get('gcal_event_id')]
        recurring_tasks = [t for t in tasks if t.get('is_recurring')]

        return {
            "totalTasks": len(non_section_tasks),
            "calendarEvents": len(calendar_events),
            "recurringTasks": len(recurring_tasks),
            "generatedAt": format_timestamp()
        }

    def _normalize_calendar_tasks(
        self, 
        calendar_tasks: List[Dict[str, Any]], 
        target_date: str
    ) -> List[Dict[str, Any]]:
        """
        Normalize calendar tasks with required fields and date alignment.
        
        Args:
            calendar_tasks: List of calendar task objects to normalize
            target_date: Date string in YYYY-MM-DD format
            
        Returns:
            List of normalized calendar task objects
        """
        normalized_tasks = []
        
        for task in calendar_tasks:
            normalized_task = dict(task)
            normalized_task['from_gcal'] = True
            normalized_task['start_date'] = target_date
            
            # Set type if not already present
            if 'type' not in normalized_task:
                normalized_task['type'] = 'task'
                
            normalized_tasks.append(normalized_task)
            
        return normalized_tasks

    def _filter_calendar_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter tasks that are from Google Calendar.
        
        Args:
            tasks: List of task objects to filter
            
        Returns:
            List of calendar task objects
        """
        return [task for task in tasks if task.get('from_gcal', False)]

    def _filter_non_calendar_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter tasks that are not from Google Calendar.
        
        Args:
            tasks: List of task objects to filter
            
        Returns:
            List of non-calendar task objects
        """
        return [task for task in tasks if not task.get('from_gcal', False)]

    def _filter_section_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter section tasks from task list.
        
        Args:
            tasks: List of task objects to filter
            
        Returns:
            List of section task objects
        """
        return [task for task in tasks if task.get('is_section', False) or task.get('type') == 'section']

    def _filter_non_section_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter non-section tasks from task list.
        
        Args:
            tasks: List of task objects to filter
            
        Returns:
            List of non-section task objects
        """
        return [task for task in tasks if not task.get('is_section', False) and task.get('type') != 'section']

    def _validate_and_prepare_schedule_document(
        self, 
        base_document: Dict[str, Any], 
        user_id: str, 
        date: str
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Validate schedule document and prepare for database storage.
        
        Consolidates validation logic used across multiple schedule creation methods.
        
        Args:
            base_document: Base schedule document to validate
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str], prepared_document: Optional[Dict])
        """
        try:
            # Create a copy for preparation
            prepared_doc = dict(base_document)
            
            # Ensure date is in canonical format
            formatted_date = format_schedule_date(date)
            prepared_doc["date"] = formatted_date
            prepared_doc["userId"] = user_id
            
            # Validate document structure
            is_valid, validation_error = validate_schedule_document(prepared_doc)
            if not is_valid:
                return False, f"Schedule validation failed: {validation_error}", None
                
            return True, None, prepared_doc
            
        except Exception as e:
            return False, f"Validation error: {str(e)}", None

    def _process_schedule_inputs(self, raw_inputs: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process and sanitize user inputs with safe defaults.
        
        Consolidates input processing logic used across schedule creation methods.
        
        Args:
            raw_inputs: Raw user input data (can be None or incomplete)
            
        Returns:
            Dictionary with processed inputs and safe defaults
        """
        if raw_inputs is None:
            raw_inputs = {}
            
        # Prepare inputs with safe defaults and type checking
        processed_inputs = {
            "name": raw_inputs.get('name', '') if raw_inputs.get('name') is not None else '',
            "work_start_time": raw_inputs.get('work_start_time', '') if raw_inputs.get('work_start_time') is not None else '',
            "work_end_time": raw_inputs.get('work_end_time', '') if raw_inputs.get('work_end_time') is not None else '',
            "energy_patterns": raw_inputs.get('energy_patterns', []) if isinstance(raw_inputs.get('energy_patterns'), list) else [],
            "priorities": raw_inputs.get('priorities', {}) if isinstance(raw_inputs.get('priorities'), dict) else {},
            "layout_preference": raw_inputs.get('layout_preference', {}) if isinstance(raw_inputs.get('layout_preference'), dict) else {},
            "tasks": raw_inputs.get('tasks', []) if isinstance(raw_inputs.get('tasks'), list) else []
        }
        
        return processed_inputs

    def _upsert_calendar_tasks_by_id(
        self, 
        existing_calendar_tasks: List[Dict[str, Any]], 
        incoming_calendar_tasks: List[Dict[str, Any]], 
        target_date: str
    ) -> List[Dict[str, Any]]:
        """
        Upsert calendar tasks by gcal_event_id, preserving local state.
        
        Consolidates calendar task upserting logic used across multiple methods.
        
        Args:
            existing_calendar_tasks: Current calendar tasks in schedule
            incoming_calendar_tasks: Fresh calendar tasks from Google Calendar API
            target_date: Date string in YYYY-MM-DD format
            
        Returns:
            List of merged calendar tasks with preserved local state
        """
        if not incoming_calendar_tasks:
            return existing_calendar_tasks
            
        # Normalize incoming tasks
        normalized_incoming = self._normalize_calendar_tasks(incoming_calendar_tasks, target_date)
        
        # Map existing calendar tasks by gcal_event_id
        existing_by_id: Dict[str, Dict[str, Any]] = {}
        existing_without_id: List[Dict[str, Any]] = []
        for task in existing_calendar_tasks:
            gid = task.get('gcal_event_id')
            if gid:
                existing_by_id[gid] = task
            else:
                existing_without_id.append(task)
        
        fetched_ids = {task.get('gcal_event_id') for task in normalized_incoming if task.get('gcal_event_id')}
        
        # Upsert incoming tasks
        upserted_calendar: List[Dict[str, Any]] = []
        for incoming in normalized_incoming:
            gid = incoming.get('gcal_event_id')
            if not gid:
                continue
                
            if gid in existing_by_id:
                # Update existing task while preserving local state
                existing_task = existing_by_id[gid]
                merged_task = {**existing_task}
                
                # Update Google-sourced fields
                merged_task['text'] = incoming.get('text', merged_task.get('text'))
                merged_task['start_time'] = incoming.get('start_time', merged_task.get('start_time'))
                merged_task['end_time'] = incoming.get('end_time', merged_task.get('end_time'))
                merged_task['start_date'] = target_date
                merged_task['from_gcal'] = True
                
                if 'type' not in merged_task:
                    merged_task['type'] = 'task'
                    
                upserted_calendar.append(merged_task)
            else:
                # New calendar task
                new_task = dict(incoming)
                new_task['from_gcal'] = True
                new_task['start_date'] = target_date
                if 'type' not in new_task:
                    new_task['type'] = 'task'
                if 'id' not in new_task:
                    new_task['id'] = str(uuid.uuid4())
                    
                upserted_calendar.append(new_task)
        
        # Preserve existing calendar tasks not present in fetched set
        preserved_existing = []
        for task in existing_calendar_tasks:
            gid = task.get('gcal_event_id')
            if not gid or gid not in fetched_ids:
                # Ensure preserved tasks also have correct date and required fields
                preserved_task = dict(task)
                preserved_task['start_date'] = target_date
                preserved_task['from_gcal'] = True
                if 'type' not in preserved_task:
                    preserved_task['type'] = 'task'
                preserved_existing.append(preserved_task)
        
        return upserted_calendar + preserved_existing

    def _rebuild_tasks_preserving_calendar_positions(
        self, 
        source_tasks: List[Dict[str, Any]], 
        upserted_calendar: List[Dict[str, Any]], 
        fetched_calendar_ids: set
    ) -> List[Dict[str, Any]]:
        """
        Rebuild task list preserving relative positions of calendar events.
        
        Strategy: Keep all existing items in their original positions, only insert 
        new calendar events at the top (after sections) to avoid grouping existing events.
        
        Args:
            source_tasks: Original task list with existing positions
            upserted_calendar: Calendar tasks after upserting
            fetched_calendar_ids: Set of gcal_event_ids that were fetched
            
        Returns:
            Rebuilt task list with preserved positions
        """
        if not source_tasks and not upserted_calendar:
            return []
            
        # Map calendar tasks by gcal_event_id for easy lookup
        existing_calendar_map: Dict[str, Dict[str, Any]] = {}
        for task in source_tasks:
            if task.get('from_gcal', False):
                gid = task.get('gcal_event_id')
                if gid:
                    existing_calendar_map[gid] = task
        
        upserted_by_id: Dict[str, Dict[str, Any]] = {}
        new_calendar_tasks: List[Dict[str, Any]] = []
        for task in upserted_calendar:
            gid = task.get('gcal_event_id')
            if gid:
                upserted_by_id[gid] = task
                if gid not in existing_calendar_map:
                    # This is a brand new calendar event
                    new_calendar_tasks.append(task)
        
        # Step 1: Process existing tasks in their original positions
        # Replace existing calendar events with updated versions, keep everything else as-is
        updated_existing: List[Dict[str, Any]] = []
        for item in source_tasks:
            if item.get('from_gcal', False):
                gid = item.get('gcal_event_id')
                if gid and gid in upserted_by_id:
                    # Replace with updated version while preserving position and section
                    updated_task = dict(upserted_by_id[gid])
                    if item.get('section') and not updated_task.get('section'):
                        updated_task['section'] = item.get('section')
                    updated_existing.append(updated_task)
                else:
                    # Keep existing calendar task (not in current fetch)
                    updated_existing.append(item)
            else:
                # Non-calendar task - keep as is
                updated_existing.append(item)
        
        # Step 2: Insert new calendar events at the top (after sections)
        if not new_calendar_tasks:
            return updated_existing
            
        # Find insertion point: after any leading sections but before other content
        insertion_index = 0
        inherited_section: Optional[str] = None
        last_section_name: Optional[str] = None
        
        # Skip over leading sections and determine section inheritance
        for i, item in enumerate(updated_existing):
            if item.get('is_section', False) or item.get('type') == 'section':
                insertion_index = i + 1
                last_section_name = item.get('text')  # Remember the last section we saw
            else:
                # Found first non-section item - check if it has a section assigned
                item_section = item.get('section')
                if item_section:
                    inherited_section = item_section
                elif last_section_name:
                    # If item doesn't have explicit section, use the last section we passed
                    inherited_section = last_section_name
                break
        
        # Prepare new calendar items with inherited section
        prepared_new_items: List[Dict[str, Any]] = []
        for new_task in new_calendar_tasks:
            new_item = dict(new_task)
            if inherited_section and not new_item.get('section'):
                new_item['section'] = inherited_section
            prepared_new_items.append(new_item)
        
        # Sort new calendar items by time before inserting
        sorted_new_items = self._sort_calendar_block(prepared_new_items)
        
        # Insert new events at the determined position
        final_tasks = (updated_existing[:insertion_index] + 
                      sorted_new_items + 
                      updated_existing[insertion_index:])
        
        return final_tasks


# Create singleton instance for import
schedule_service = ScheduleService()