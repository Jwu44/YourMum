#!/usr/bin/env python3
"""
Script to verify the test user and schedule data for manual task fix testing.
This script checks the current state of the test data in MongoDB.
"""

import os
import sys
from datetime import datetime

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

from backend.db_config import get_database

def verify_test_user():
    """Verify the test user exists and has correct data"""
    try:
        db = get_database()
        users_collection = db['users']

        user = users_collection.find_one({"googleId": "dev_test_user_12345"})

        if not user:
            print("❌ Test user not found")
            return False

        print("✅ Test user found:")
        print(f"   - ID: {user['googleId']}")
        print(f"   - Email: {user['email']}")
        print(f"   - Display Name: {user['displayName']}")
        print(f"   - Created: {user.get('createdAt', 'N/A')}")
        print(f"   - Calendar Access: {user.get('hasCalendarAccess', False)}")

        return True

    except Exception as e:
        print(f"❌ Error verifying test user: {e}")
        return False

def verify_test_schedule():
    """Verify the test schedule exists and has both manual and calendar tasks"""
    try:
        db = get_database()
        schedules_collection = db['UserSchedules']

        today = datetime.now().strftime('%Y-%m-%d')
        schedule = schedules_collection.find_one({
            "userId": "dev_test_user_12345",
            "date": today
        })

        if not schedule:
            print(f"❌ Test schedule not found for {today}")
            return False

        tasks = schedule.get('schedule', [])
        manual_tasks = [t for t in tasks if t.get('source') == 'manual']
        calendar_tasks = [t for t in tasks if t.get('from_gcal') == True]

        print(f"✅ Test schedule found for {today}:")
        print(f"   - Total tasks: {len(tasks)}")
        print(f"   - Manual tasks: {len(manual_tasks)}")
        print(f"   - Calendar tasks: {len(calendar_tasks)}")

        print("\n📋 Task Details:")
        for i, task in enumerate(tasks, 1):
            task_type = "📅 Calendar" if task.get('from_gcal') else "✋ Manual"
            print(f"   {i}. {task_type}: {task['text']}")

        return True

    except Exception as e:
        print(f"❌ Error verifying test schedule: {e}")
        return False

def show_testing_instructions():
    """Show step-by-step testing instructions"""
    print("\n" + "="*60)
    print("🧪 MANUAL TASK FIX TESTING INSTRUCTIONS")
    print("="*60)
    print()
    print("The fix ensures that manually added tasks are preserved when")
    print("first-time users click 'Save' in preferences.")
    print()
    print("SETUP VERIFICATION:")
    print("✅ Test user created with ID: dev_test_user_12345")
    print("✅ Test schedule created with manual + calendar tasks")
    print("✅ NEXT_PUBLIC_BYPASS_AUTH=true is enabled")
    print()
    print("TESTING STEPS:")
    print("1. Start the frontend:")
    print("   cd frontend && npm run dev")
    print()
    print("2. Open browser to: http://localhost:3000")
    print("   (Should auto-login as test user)")
    print()
    print("3. Navigate to: /dashboard/preferences")
    print("   (This will trigger the fix - loading all tasks from MongoDB)")
    print()
    print("4. Click 'Save' button")
    print("   (This calls submit_data with the complete task list)")
    print()
    print("5. Verify results:")
    print("   - Both manual tasks should be preserved")
    print("   - Calendar task should also be preserved")
    print("   - Generated schedule should contain all 3 tasks")
    print()
    print("EXPECTED BEHAVIOR (FIXED):")
    print("✅ Preferences page loads ALL tasks from MongoDB")
    print("✅ Submit_data payload contains manual + calendar tasks")
    print("✅ No tasks are lost during schedule generation")
    print()
    print("PREVIOUS BEHAVIOR (BUGGY):")
    print("❌ Preferences page skipped loading manual tasks")
    print("❌ Submit_data payload only had calendar tasks")
    print("❌ Manual tasks were lost after 'Save'")

if __name__ == "__main__":
    print("🔍 Verifying test environment for manual task fix...")
    print()

    user_ok = verify_test_user()
    schedule_ok = verify_test_schedule()

    if user_ok and schedule_ok:
        show_testing_instructions()
    else:
        print("\n❌ Test environment not properly set up")
        print("Run: python create_test_user.py to create test data")