#!/usr/bin/env python3
"""
Test script to reproduce the user creation issue.
"""
import sys
import os
sys.path.append('.')

from backend.db_config import get_database, create_or_update_user
from datetime import datetime, timezone

# Import the exact function used in OAuth callback
def import_oauth_functions():
    """Import OAuth callback functions to test exact same pipeline."""
    try:
        from backend.apis.routes import _prepare_user_data_for_storage, process_user_for_response
        return _prepare_user_data_for_storage, process_user_for_response
    except ImportError as e:
        print(f"Failed to import OAuth functions: {e}")
        return None, None

def test_user_creation():
    """Test creating a user to reproduce the 500 error."""

    # Import functions from OAuth callback
    prepare_user_data, process_user_for_response = import_oauth_functions()
    if not prepare_user_data:
        print("❌ Could not import OAuth functions")
        return

    # Sample user data similar to what OAuth callback would generate
    oauth_user_data = {
        'googleId': 'test-existing-user-456',
        'email': 'existing@example.com',
        'displayName': 'Existing Test User',
        'photoURL': 'https://example.com/existing.jpg',
        'hasCalendarAccess': True,
        'calendarTokens': {
            'accessToken': 'sample-access-token',
            'refreshToken': 'sample-refresh-token',
            'expiresAt': datetime.now(timezone.utc),
            'scope': 'https://www.googleapis.com/auth/calendar.readonly'
        }
    }

    print("Testing OAuth callback pipeline with existing user...")
    print(f"OAuth user data: {oauth_user_data}")

    try:
        # Step 1: Prepare user data for storage (same as OAuth callback)
        processed_user_data = prepare_user_data(oauth_user_data)
        print(f"✅ Step 1 - Data preparation successful")
        print(f"Processed data: {processed_user_data}")

        # Step 2: Get database and users collection
        db = get_database()
        users = db['users']

        # Step 3: Try to create/update the user (same as OAuth callback)
        user = create_or_update_user(users, processed_user_data)

        if not user:
            print("❌ Step 3 - User creation/update failed - returned None")
            return

        print(f"✅ Step 3 - User creation/update successful")

        # Step 4: Serialize user data for response (same as OAuth callback)
        serialized_user = process_user_for_response(user)
        print(f"✅ Step 4 - User serialization successful")
        print(f"Serialized user: {serialized_user}")

        print("🎉 Full OAuth callback pipeline test successful!")

    except Exception as e:
        print(f"❌ Exception during OAuth callback pipeline: {e}")
        import traceback
        traceback.print_exc()

def test_existing_user_update():
    """Test updating an existing user to reproduce the existing user 500 error."""

    # Import functions from OAuth callback
    prepare_user_data, process_user_for_response = import_oauth_functions()
    if not prepare_user_data:
        print("❌ Could not import OAuth functions")
        return

    print("\n" + "="*50)
    print("Testing existing user update scenario...")

    # First, create a user
    test_user_creation()

    # Now try to update the same user (this is what happens with existing users)
    oauth_user_data = {
        'googleId': 'test-existing-user-456',  # Same ID as above
        'email': 'existing@example.com',
        'displayName': 'Updated Test User',  # Changed display name
        'photoURL': 'https://example.com/updated.jpg',
        'hasCalendarAccess': True,
        'calendarTokens': {
            'accessToken': 'new-access-token',
            'refreshToken': 'new-refresh-token',
            'expiresAt': datetime.now(timezone.utc),
            'scope': 'https://www.googleapis.com/auth/calendar.readonly'
        }
    }

    print(f"Updating existing user with new OAuth data: {oauth_user_data}")

    try:
        # Same pipeline as OAuth callback
        processed_user_data = prepare_user_data(oauth_user_data)

        db = get_database()
        users = db['users']

        user = create_or_update_user(users, processed_user_data)

        if not user:
            print("❌ Existing user update failed - returned None")
            return

        print(f"✅ Existing user update successful")

        serialized_user = process_user_for_response(user)
        print(f"✅ Existing user serialization successful")

        print("🎉 Existing user update test successful!")

    except Exception as e:
        print(f"❌ Exception during existing user update: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_user_creation()
    test_existing_user_update()