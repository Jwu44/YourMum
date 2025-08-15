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
            # Prepare inputs with safe defaults
            processed_inputs = {
                "name": inputs.get('name', ''),
                "work_start_time": inputs.get('work_start_time', ''),
                "work_end_time": inputs.get('work_end_time', ''),
                "working_days": inputs.get('working_days', []),
                "energy_patterns": inputs.get('energy_patterns', []),
                "priorities": inputs.get('priorities', {}),
                "layout_preference": inputs.get('layout_preference', {}),
                "tasks": inputs.get('tasks', [])
            }
            
            # Create schedule document using centralized helper
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=generated_tasks,
                source="ai_service",
                inputs=processed_inputs
            )
            
            # Validate document before storage
            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}
            
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
        Create or merge calendar tasks into existing schedule with a preservation-first strategy.
        - Keep non-calendar tasks untouched
        - If fetched calendar list is empty: preserve existing calendar tasks (non-destructive)
        - Otherwise: upsert fetched events by gcal_event_id, preserving existing ID and completion,
          updating Google-sourced fields (text, start_time, end_time, start_date). Preserve all
          existing calendar tasks not present in the fetched set.
        
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
            
            # Check if schedule exists
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })
            
            if existing_schedule:
                # Non-destructive merge strategy:
                # - Keep non-calendar tasks untouched
                # - If fetched calendar list is empty: preserve existing calendar tasks (no DB write)
                # - Otherwise: upsert fetched by gcal_event_id, preserving ID/completed and updating text/times
                existing_tasks = existing_schedule.get('schedule', [])
                non_calendar_tasks = [t for t in existing_tasks if not t.get('from_gcal', False)]
                existing_calendar_tasks = [t for t in existing_tasks if t.get('from_gcal', False)]

                # Normalize incoming tasks as calendar tasks with required fields
                normalized_incoming_calendar_tasks: List[Dict[str, Any]] = []
                for task in calendar_tasks:
                    calendar_task = dict(task)
                    calendar_task['from_gcal'] = True
                    if 'type' not in calendar_task:
                        calendar_task['type'] = 'task'
                    normalized_incoming_calendar_tasks.append(calendar_task)

                # If incoming list is empty, leave existing calendar tasks untouched
                if len(normalized_incoming_calendar_tasks) == 0:
                    final_tasks = existing_calendar_tasks + non_calendar_tasks
                    # Do not update DB to avoid unnecessary writes; return current state
                    metadata = self._calculate_schedule_metadata(final_tasks)
                    metadata.update({
                        "generatedAt": existing_schedule.get('metadata', {}).get('created_at', ''),
                        "lastModified": existing_schedule.get('metadata', {}).get('last_modified', ''),
                        "source": existing_schedule.get('metadata', {}).get('source', 'calendar_sync'),
                        "calendarSynced": True,
                        "calendarEvents": len([t for t in final_tasks if t.get('from_gcal', False)])
                    })
                    return True, {
                        "schedule": final_tasks,
                        "date": date,
                        "metadata": metadata
                    }

                # Upsert fetched by gcal_event_id, preserving existing ID and completion
                existing_by_id: Dict[str, Dict[str, Any]] = {}
                for t in existing_calendar_tasks:
                    gid = t.get('gcal_event_id')
                    if gid:
                        existing_by_id[gid] = t

                fetched_ids = {t.get('gcal_event_id') for t in normalized_incoming_calendar_tasks if t.get('gcal_event_id')}

                upserted_calendar: List[Dict[str, Any]] = []
                for inc in normalized_incoming_calendar_tasks:
                    gid = inc.get('gcal_event_id')
                    if not gid:
                        continue
                    if gid in existing_by_id:
                        current = existing_by_id[gid]
                        merged_item = {**current}
                        # Update Google-sourced fields while preserving local ID and completion
                        merged_item['text'] = inc.get('text', merged_item.get('text'))
                        merged_item['start_time'] = inc.get('start_time', merged_item.get('start_time'))
                        merged_item['end_time'] = inc.get('end_time', merged_item.get('end_time'))
                        merged_item['start_date'] = date
                        merged_item['from_gcal'] = True
                        if 'type' not in merged_item:
                            merged_item['type'] = 'task'
                        upserted_calendar.append(merged_item)
                    else:
                        new_item = dict(inc)
                        new_item['from_gcal'] = True
                        if 'type' not in new_item:
                            new_item['type'] = 'task'
                        new_item['start_date'] = date
                        upserted_calendar.append(new_item)

                # Preserve all existing calendar tasks not present in fetched set (completed and incomplete)
                preserved_existing = []
                for t in existing_calendar_tasks:
                    gid = t.get('gcal_event_id')
                    if not gid or gid not in fetched_ids:
                        preserved_existing.append(t)

                merged_calendar_tasks = upserted_calendar + preserved_existing
                final_tasks = merged_calendar_tasks + non_calendar_tasks

                # Update existing schedule with merged calendar tasks at top
                existing_metadata = existing_schedule.get('metadata', {})
                update_doc = {
                    "schedule": final_tasks,
                    "metadata": {
                        **existing_metadata,
                        "last_modified": format_timestamp(),
                        "calendarSynced": True,
                        "calendarEvents": len([t for t in merged_calendar_tasks if t.get('from_gcal', False)]),
                        "source": "calendar_sync"
                    }
                }

                # Validate before updating
                temp_doc = {**existing_schedule, **update_doc}
                # Ensure date is in canonical format for validation
                temp_doc["date"] = formatted_date
                is_valid, validation_error = validate_schedule_document(temp_doc)
                if not is_valid:
                    return False, {"error": f"Schedule validation failed: {validation_error}"}

                # Update database (treat no-op as success to avoid false failure)
                self.schedules_collection.update_one(
                    {"userId": user_id, "date": formatted_date},
                    {"$set": update_doc}
                )
                
            else:
                # Create new schedule with calendar tasks only
                new_calendar_tasks = []
                for task in calendar_tasks:
                    calendar_task = dict(task)
                    calendar_task['from_gcal'] = True
                    # Ensure required fields for validation
                    if 'type' not in calendar_task:
                        calendar_task['type'] = 'task'
                    new_calendar_tasks.append(calendar_task)
                
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
                
                result = self.schedules_collection.insert_one(schedule_document)
                final_tasks = new_calendar_tasks
            
            # Calculate metadata for response
            metadata = self._calculate_schedule_metadata(final_tasks)
            metadata.update({
                "generatedAt": format_timestamp(),
                "lastModified": format_timestamp(),
                "source": "calendar_sync",
                "calendarSynced": True,
                "calendarEvents": len([t for t in final_tasks if t.get('from_gcal', False)])
            })
            
            return True, {
                "schedule": final_tasks,
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
            non_calendar_tasks = [t for t in existing_tasks if not t.get('from_gcal', False)]
            existing_calendar_tasks = [t for t in existing_tasks if t.get('from_gcal', False)]

            # If incoming list is empty, return current state non-destructively
            normalized_incoming: List[Dict[str, Any]] = []
            for task in calendar_tasks:
                # Skip any task lacking a gcal_event_id (avoid duplicates)
                if not task.get('gcal_event_id'):
                    continue
                new_task = dict(task)
                new_task['from_gcal'] = True
                if 'type' not in new_task:
                    new_task['type'] = 'task'
                normalized_incoming.append(new_task)

            if len(normalized_incoming) == 0:
                final_tasks = existing_calendar_tasks + non_calendar_tasks
                metadata = self._calculate_schedule_metadata(final_tasks)
                if existing_schedule:
                    metadata.update({
                        "generatedAt": existing_schedule.get('metadata', {}).get('created_at', ''),
                        "lastModified": existing_schedule.get('metadata', {}).get('last_modified', ''),
                        "source": existing_schedule.get('metadata', {}).get('source', 'calendar_sync'),
                        "calendarSynced": True,
                        "calendarEvents": len([t for t in final_tasks if t.get('from_gcal', False)])
                    })
                else:
                    metadata.update({
                        "generatedAt": format_timestamp(),
                        "lastModified": format_timestamp(),
                        "source": "calendar_sync",
                        "calendarSynced": True,
                        "calendarEvents": len([t for t in final_tasks if t.get('from_gcal', False)])
                    })
                return True, {"schedule": final_tasks, "date": date, "metadata": metadata}

            # Map existing calendar tasks by gcal_event_id (include those missing id in a separate list)
            existing_by_id: Dict[str, Dict[str, Any]] = {}
            existing_without_id: List[Dict[str, Any]] = []
            for t in existing_calendar_tasks:
                gid = t.get('gcal_event_id')
                if gid:
                    existing_by_id[gid] = t
                else:
                    existing_without_id.append(t)

            fetched_ids = [t.get('gcal_event_id') for t in normalized_incoming if t.get('gcal_event_id')]

            # Upsert fetched events preserving ID and completion
            upserted_calendar: List[Dict[str, Any]] = []
            for inc in normalized_incoming:
                gid = inc.get('gcal_event_id')
                if not gid:
                    continue  # safety; should be filtered already
                if gid in existing_by_id:
                    current = existing_by_id[gid]
                    merged = {**current}
                    # Preserve ID and completion and user edits; update Google-sourced fields
                    merged['text'] = inc.get('text', merged.get('text'))
                    merged['start_time'] = inc.get('start_time', merged.get('start_time'))
                    merged['end_time'] = inc.get('end_time', merged.get('end_time'))
                    merged['start_date'] = date
                    merged['from_gcal'] = True
                    if 'type' not in merged:
                        merged['type'] = 'task'
                    upserted_calendar.append(merged)
                else:
                    # New incoming event
                    new_item = dict(inc)
                    new_item['from_gcal'] = True
                    if 'type' not in new_item:
                        new_item['type'] = 'task'
                    # Ensure date alignment
                    new_item['start_date'] = date
                    upserted_calendar.append(new_item)

            # Preserve all existing calendar tasks not present in fetched set (completed and incomplete)
            fetched_id_set = set(fetched_ids)
            preserved_existing = []
            for t in existing_calendar_tasks:
                gid = t.get('gcal_event_id')
                if not gid or gid not in fetched_id_set:
                    preserved_existing.append(t)

            # Preserve relative positions of existing calendar events.
            # Strategy:
            # 1) Build a map of existing calendar tasks by gcal_event_id
            # 2) Walk the existing_tasks in order. For each item:
            #    - If it's an existing calendar task and present in upserted_calendar, use the upserted copy in place
            #    - If it's an existing calendar task not present in fetched set, keep it as is
            #    - If it's a non-calendar task, include for now (filtered later for duplicates)
            # 3) After the walk, append any brand-new calendar tasks (those not in existing list) immediately
            #    after the last existing calendar task block to maintain grouping under the same section.

            existing_calendar_map: Dict[str, Dict[str, Any]] = {}
            for t in existing_calendar_tasks:
                gid = t.get('gcal_event_id')
                if gid:
                    existing_calendar_map[gid] = t

            upserted_by_id: Dict[str, Dict[str, Any]] = {}
            new_calendar_ids: List[str] = []
            for t in upserted_calendar:
                gid = t.get('gcal_event_id')
                if not gid:
                    continue
                upserted_by_id[gid] = t
                if gid not in existing_calendar_map:
                    new_calendar_ids.append(gid)

            # Rebuild list preserving order of existing items
            rebuilt: List[Dict[str, Any]] = []
            last_calendar_index = -1
            for item in existing_tasks:
                if item.get('from_gcal', False):
                    gid = item.get('gcal_event_id')
                    if gid and gid in upserted_by_id:
                        merged_copy = dict(upserted_by_id[gid])
                        # Preserve the original section placement if present
                        if item.get('section') and not merged_copy.get('section'):
                            merged_copy['section'] = item.get('section')
                        rebuilt.append(merged_copy)
                    else:
                        rebuilt.append(item)
                    last_calendar_index = len(rebuilt) - 1
                else:
                    rebuilt.append(item)

            # Insert brand-new calendar tasks right after the last existing calendar item
            insertion_index = last_calendar_index + 1 if last_calendar_index >= 0 else 0
            new_items: List[Dict[str, Any]] = []
            # Determine inherited section once based on element before insertion
            inherited_section: Optional[str] = None
            if insertion_index > 0:
                try:
                    prev = rebuilt[insertion_index - 1]
                    inherited_section = prev.get('section') if not prev.get('is_section', False) else prev.get('text')
                except Exception:
                    inherited_section = None
            for gid in new_calendar_ids:
                new_item = dict(upserted_by_id[gid])
                if inherited_section and not new_item.get('section'):
                    new_item['section'] = inherited_section
                new_items.append(new_item)
            if new_items:
                rebuilt = rebuilt[:insertion_index] + new_items + rebuilt[insertion_index:]

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
            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}
            
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

            # Incomplete non-recurring from source (exclude calendar-origin tasks)
            source_tasks = source_schedule.get('schedule', [])
            carry_over_tasks: List[Dict[str, Any]] = []
            carry_over_calendar_tasks: List[Dict[str, Any]] = []
            for task in source_tasks:
                if task.get('is_section', False) or task.get('type') == 'section':
                    continue
                if task.get('is_recurring'):
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

            # Recurring tasks due on target date
            recurring_tasks = self._get_recurring_tasks_for_date(user_id, date)

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
            "working_days": [],
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
                        inputs.get('working_days'),
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
        max_days_back: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Find all recurring tasks that should occur on the target date.
        Searches through recent schedules to find recurring tasks.
        
        Args:
            user_id: User's Google ID or Firebase UID
            target_date: Date string in YYYY-MM-DD format
            max_days_back: Maximum number of days to search back for recurring tasks
            
        Returns:
            List of recurring task objects that should occur on target date
        """
        try:
            target_dt = datetime.strptime(target_date, '%Y-%m-%d')
            recurring_tasks = []
            seen_task_texts = set()  # Prevent duplicates
            
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
                        if (task.get('is_recurring') and 
                            not task.get('is_section', False) and
                            task.get('text') not in seen_task_texts):
                            
                            if self._should_task_recur_on_date(task, target_dt):
                                # Create a copy of the task for the new date
                                recurring_task = {
                                    **task,
                                    "id": str(uuid.uuid4()),  # New ID for new date
                                    "start_date": target_date,
                                    "completed": False  # Reset completion status
                                }
                                recurring_tasks.append(recurring_task)
                                seen_task_texts.add(task.get('text'))
                                
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


# Create singleton instance for import
schedule_service = ScheduleService()