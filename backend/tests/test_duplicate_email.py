#!/usr/bin/env python3
"""
Test script to reproduce the duplicate email error.
"""
import sys
import os
sys.path.append('.')

from backend.db_config import get_database, create_or_update_user
from datetime import datetime, timezone

def test_duplicate_email_scenario():
    """Test the exact scenario that causes duplicate key error."""

    print("Testing duplicate email scenario...")

    # First user with email justin.wu4444@gmail.com
    first_user_data = {
        'googleId': 'first-google-id-123',
        'email': 'justin.wu4444@gmail.com',
        'displayName': 'First User',
        'photoURL': 'https://example.com/first.jpg',
        'hasCalendarAccess': True,
        'calendarSynced': True,
        'calendar': {'connected': True}
    }

    # Second user with DIFFERENT googleId but SAME email
    second_user_data = {
        'googleId': 'second-google-id-456',
        'email': 'justin.wu4444@gmail.com',  # Same email!
        'displayName': 'Second User',
        'photoURL': 'https://example.com/second.jpg',
        'hasCalendarAccess': True,
        'calendarSynced': True,
        'calendar': {'connected': True}
    }

    try:
        db = get_database()
        users = db['users']

        print("Step 1: Creating first user...")
        first_user = create_or_update_user(users, first_user_data)
        if first_user:
            print(f"✅ First user created successfully: {first_user['googleId']}")
        else:
            print("❌ First user creation failed")
            return

        print("Step 2: Trying to create second user with same email...")
        second_user = create_or_update_user(users, second_user_data)
        if second_user:
            print(f"✅ Second user created successfully: {second_user['googleId']}")
        else:
            print("❌ Second user creation failed")

    except Exception as e:
        print(f"❌ Exception during duplicate email test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_duplicate_email_scenario()