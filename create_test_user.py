#!/usr/bin/env python3
"""
Script to create a test user in MongoDB matching the mock user from AuthContext.tsx
This allows for local testing of the manual task fix without authentication flow.
"""

import os
import sys
from datetime import datetime, timezone

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

from backend.db_config import get_database

def create_test_user():
    """Create a test user in MongoDB matching the mock user from AuthContext.tsx"""

    try:
        # Get database connection
        db = get_database()
        users_collection = db['users']

        # Test user data matching AuthContext.tsx mock user
        test_user_data = {
            "googleId": "dev_test_user_12345",  # Matches AuthContext.tsx mock
            "email": "dev@example.com",         # Matches AuthContext.tsx mock
            "displayName": "Dev User Updated",  # Matches AuthContext.tsx mock
            "photoURL": "",
            "timezone": "UTC",
            "jobTitle": None,
            "age": None,
            "hasCalendarAccess": False,
            "calendarSynced": False,
            "lastLogin": datetime.now(timezone.utc),
            "createdAt": datetime.now(timezone.utc),  # Required field
            "calendar": {
                "connected": False,
                "lastSyncTime": None,
                "syncStatus": "never",
                "selectedCalendars": [],
                "error": None,
                "settings": {
                    "autoSync": True,
                    "syncFrequency": 15,
                    "defaultReminders": True
                }
            },
            "metadata": {
                "lastModified": datetime.now(timezone.utc),
                "createdForTesting": True
            }
        }

        # Check if user already exists
        existing_user = users_collection.find_one({"googleId": "dev_test_user_12345"})

        if existing_user:
            print("✅ Test user already exists in database")
            print(f"   - ID: {existing_user['googleId']}")
            print(f"   - Email: {existing_user['email']}")
            print(f"   - Display Name: {existing_user['displayName']}")
            return existing_user

        # Insert the test user
        result = users_collection.insert_one(test_user_data)

        if result.inserted_id:
            print("✅ Test user created successfully!")
            print(f"   - ID: {test_user_data['googleId']}")
            print(f"   - Email: {test_user_data['email']}")
            print(f"   - Display Name: {test_user_data['displayName']}")
            print(f"   - MongoDB _id: {result.inserted_id}")

            # Verify the user was created
            created_user = users_collection.find_one({"googleId": "dev_test_user_12345"})
            return created_user
        else:
            print("❌ Failed to create test user")
            return None

    except Exception as e:
        print(f"❌ Error creating test user: {str(e)}")
        return None

def create_test_schedule():
    """Create a test schedule with both manual and calendar tasks for testing"""

    try:
        # Get database connection
        db = get_database()
        schedules_collection = db['UserSchedules']

        # Today's date for the test schedule
        today = datetime.now().strftime('%Y-%m-%d')

        # Check if schedule already exists
        existing_schedule = schedules_collection.find_one({
            "userId": "dev_test_user_12345",
            "date": today
        })

        if existing_schedule:
            print(f"✅ Test schedule already exists for {today}")
            print(f"   - {len(existing_schedule.get('schedule', []))} tasks")
            return existing_schedule

        # Test schedule with both manual and calendar tasks
        test_schedule_data = {
            "userId": "dev_test_user_12345",
            "date": today,
            "schedule": [
                {
                    "id": "manual-task-1",
                    "text": "Complete project documentation",
                    "type": "task",
                    "is_section": False,
                    "categories": ["work"],
                    "start_time": None,
                    "end_time": None,
                    "is_recurring": None,
                    "completed": False,
                    "is_subtask": False,
                    "section": None,
                    "parent_id": None,
                    "level": 0,
                    "section_index": 0,
                    "start_date": today,
                    "source": "manual"
                },
                {
                    "id": "manual-task-2",
                    "text": "Review code changes",
                    "type": "task",
                    "is_section": False,
                    "categories": ["work"],
                    "start_time": None,
                    "end_time": None,
                    "is_recurring": None,
                    "completed": False,
                    "is_subtask": False,
                    "section": None,
                    "parent_id": None,
                    "level": 0,
                    "section_index": 1,
                    "start_date": today,
                    "source": "manual"
                },
                {
                    "id": "calendar-task-1",
                    "text": "Team standup meeting",
                    "type": "task",
                    "is_section": False,
                    "categories": [],
                    "start_time": "09:00",
                    "end_time": "09:30",
                    "is_recurring": None,
                    "completed": False,
                    "is_subtask": False,
                    "section": None,
                    "parent_id": None,
                    "level": 0,
                    "section_index": 2,
                    "start_date": today,
                    "from_gcal": True,
                    "gcal_event_id": "test-calendar-event-1"
                }
            ],
            "inputs": {},
            "metadata": {
                "created_at": datetime.now(timezone.utc),
                "last_modified": datetime.now(timezone.utc),
                "source": "manual",
                "calendarSynced": True,
                "calendarEvents": 1,
                "createdForTesting": True
            }
        }

        # Insert the test schedule
        result = schedules_collection.insert_one(test_schedule_data)

        if result.inserted_id:
            print(f"✅ Test schedule created successfully for {today}!")
            print(f"   - 2 manual tasks + 1 calendar task")
            print(f"   - MongoDB _id: {result.inserted_id}")
            return test_schedule_data
        else:
            print("❌ Failed to create test schedule")
            return None

    except Exception as e:
        print(f"❌ Error creating test schedule: {str(e)}")
        return None

if __name__ == "__main__":
    print("🧪 Creating test user and schedule for manual task fix testing...")
    print("=" * 60)

    # Create test user
    user = create_test_user()

    if user:
        print()
        # Create test schedule with tasks
        schedule = create_test_schedule()

        if schedule:
            print()
            print("🎉 Test environment setup complete!")
            print()
            print("Testing Instructions:")
            print("1. Set NEXT_PUBLIC_BYPASS_AUTH=true in frontend/.env.local")
            print("2. Start the frontend: cd frontend && npm run dev")
            print("3. Navigate to /dashboard/preferences")
            print("4. Click 'Save' and verify all tasks are preserved")
            print("5. Check that both manual tasks and calendar task appear in the generated schedule")
        else:
            print("⚠️ Test user created but schedule creation failed")
    else:
        print("❌ Failed to create test environment")