from pymongo.mongo_client import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING
from pymongo.collection import Collection
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from .models.ai_suggestions import AI_SUGGESTION_INDEXES
from .models.user_schema import user_schema_validation
from functools import lru_cache

# Load environment variables
load_dotenv()

# Get MongoDB URI from environment variables
uri = os.getenv("MONGODB_URI") + "&tlsInsecure=true"
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create a single client instance to be reused
client = MongoClient(uri)

# Connect to your database
db_name = "YourDaiSchedule"
db = client[db_name]

# Add this flag near the top of the file
_db_initialized = False

# Core database access functions
@lru_cache(maxsize=1)
def get_database():
    """Get MongoDB database instance with connection check."""
    try:
        # Check connection by pinging the database
        client.admin.command('ping')
        # Only print on first connection
        if not hasattr(get_database, '_connected'):
            print(f"Successfully connected to MongoDB database: {db_name}")
            get_database._connected = True
        return db
    except ConnectionFailure as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise

def get_collection(collection_name: str) -> Collection:
    """Get MongoDB collection by name."""
    database = get_database()
    return database[collection_name]

# Collection access functions - grouped together
def get_users_collection() -> Collection:
    """Get collection for storing user data."""
    return get_collection('users')

def get_user_schedules_collection() -> Collection:
    """Get collection for storing user schedules."""
    return get_collection('UserSchedules')

def get_microstep_feedback_collection() -> Collection:
    """Get collection for storing microstep feedback."""
    return get_collection('MicrostepFeedback')

def get_decomposition_patterns_collection() -> Collection:
    """Get collection for storing successful decomposition patterns."""
    return get_collection('DecompositionPatterns')

def get_ai_suggestions_collection() -> Collection:
    """Get collection for storing AI suggestions."""
    return get_collection('AIsuggestions')

def get_calendar_events_collection():
    """
    Get the calendar_events collection from the database
    
    Returns:
        MongoDB collection for calendar events
    """
    db = get_database()
    return db['calendar_events']

# Initialization functions - grouped together
def initialize_ai_collections():
    """Initialize collections and indexes for AI suggestions feature."""
    try:
        # Get suggestions collection
        suggestions_collection = get_ai_suggestions_collection()

        # Create indexes for suggestions collection
        for index in AI_SUGGESTION_INDEXES:
            suggestions_collection.create_index(index)

        print("AI suggestions collection initialized successfully")
        
    except Exception as e:
        print(f"Error initializing AI suggestions collection: {e}")
        raise

def initialize_user_collection():
    """Initialize the users collection with required indexes."""
    try:
        users_collection = get_users_collection()

        # Create indexes for users collection
        user_indexes = [
            IndexModel([("googleId", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("role", ASCENDING)]),  # For future RBAC queries
            IndexModel([("lastLogin", ASCENDING)])  # For user activity tracking
        ]

        users_collection.create_indexes(user_indexes)
        print("Users collection initialized successfully")
        
    except Exception as e:
        print(f"Error initializing users collection: {e}")
        raise

def initialize_calendar_collections():
    """Initialize calendar-related collections and indexes."""
    try:
        # Get collections
        users = get_collection('users')
        calendar_events = get_calendar_events_collection()

        # Create user calendar indexes
        user_calendar_indexes = [
            IndexModel([("calendar.lastSyncTime", DESCENDING)]),
            IndexModel([("calendar.connected", ASCENDING)]),
            IndexModel([
                ("googleId", ASCENDING), 
                ("calendar.selectedCalendars", ASCENDING)
            ])
        ]
        users.create_indexes(user_calendar_indexes)

        # Create calendar events indexes
        calendar_event_indexes = [
            IndexModel([("userId", ASCENDING), ("startTime", ASCENDING)]),
            IndexModel([("eventId", ASCENDING)], unique=True),
            IndexModel([("calendarId", ASCENDING)]),
            IndexModel([("taskId", ASCENDING)]),
            IndexModel([
                ("userId", ASCENDING), 
                ("syncStatus", ASCENDING)
            ]),
            IndexModel([
                ("userId", ASCENDING), 
                ("startTime", ASCENDING), 
                ("endTime", ASCENDING)
            ])
        ]
        calendar_events.create_indexes(calendar_event_indexes)

        print("Calendar collections initialized successfully")
        
    except Exception as e:
        print(f"Error initializing calendar collections: {e}")
        raise

def initialize_slack_collections():
    """Initialize Slack integration collections and indexes."""
    try:
        # Get database and collection
        db = get_database()
        processed_messages = db['Processed Slack Messages']
        
        # Create indexes for efficient duplicate checking and cleanup
        slack_indexes = [
            IndexModel([("message_key", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING), ("processed_at", DESCENDING)]),
            IndexModel([("created_at", ASCENDING)], expireAfterSeconds=86400*30)  # 30 days TTL
        ]
        processed_messages.create_indexes(slack_indexes)
        
        print("Slack collections initialized successfully")
        
    except Exception as e:
        print(f"Error initializing Slack collections: {e}")
        raise

def initialize_db():
    """Initialize database connection and create necessary collections/indexes."""
    global _db_initialized
    
    try:
        # Skip initialization if already done
        if _db_initialized:
            return
        # Check database connection
        client.admin.command('ismaster')
        print("Successfully connected to MongoDB")

        # Initialize all collections
        initialize_ai_collections()
        initialize_user_collection()
        initialize_calendar_collections()
        initialize_slack_collections()

        # Create or update collection with schema validation
        db = get_database()
        
        # Setup user collection with schema validation
        if 'users' not in db.list_collection_names():
            db.create_collection('users', validator=user_schema_validation)
        else:
            db.command('collMod', 'users', validator=user_schema_validation)

        print("Database initialized successfully")
        
    except Exception as e:
        print(f"Database initialization failed: {e}")
        raise

# Data manipulation/business logic functions
def get_user_by_google_id(users_collection: Collection, google_id: str) -> Optional[Dict[str, Any]]:
    """Get user by Google ID with proper error handling."""
    try:
        return users_collection.find_one({"googleId": google_id})
    except Exception as e:
        print(f"Error retrieving user: {e}")
        return None

def update_user_login(users_collection: Collection, google_id: str) -> bool:
    """Update user's last login time and handle errors."""
    try:
        result = users_collection.update_one(
            {"googleId": google_id},
            {
                "$set": {
                    "lastLogin": datetime.now(timezone.utc),
                    "metadata.lastModified": datetime.now(timezone.utc)
                }
            }
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating user login: {e}")
        return False

def create_or_update_user(users_collection: Collection, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create or update user with proper validation and error handling."""
    try:
        # Prepare user document with required fields
        user_doc = {
            "googleId": user_data["googleId"],
            "email": user_data["email"],
            "displayName": user_data.get("displayName", ""),
            "photoURL": user_data.get("photoURL"),
            "role": user_data.get("role", "free"),
            "timezone": user_data.get("timezone", "UTC"),
            "jobTitle": user_data.get("jobTitle"),
            "age": user_data.get("age"),
            "calendarSynced": user_data.get("calendarSynced", False),
            "lastLogin": datetime.now(timezone.utc),
            "calendar": user_data.get("calendar", {}),
            "metadata": {
                "lastModified": datetime.now(timezone.utc)
            }
        }

        # Use upsert to create or update
        result = users_collection.update_one(
            {"googleId": user_data["googleId"]},
            {
                "$set": user_doc,
                "$setOnInsert": {
                    "createdAt": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )

        if result.upserted_id:
            return users_collection.find_one({"_id": result.upserted_id})
        else:
            return users_collection.find_one({"googleId": user_data["googleId"]})

    except Exception as e:
        print(f"Error creating/updating user: {e}")
        return None

def store_microstep_feedback(feedback_data: Dict[str, Any]) -> bool:
    """
    Store feedback about microstep suggestions.
    
    Args:
        feedback_data: Dictionary containing feedback information
        
    Returns:
        bool: Success status
    """
    try:
        collection = get_microstep_feedback_collection()
        result = collection.insert_one({
            **feedback_data,
            'created_at': datetime.utcnow()
        })
        
        # Update pattern statistics
        if feedback_data.get('accepted'):
            update_decomposition_pattern_stats(
                feedback_data['task_id'],
                feedback_data['microstep_id']
            )
        
        return bool(result.inserted_id)
    except Exception as e:
        print(f"Error storing microstep feedback: {e}")
        return False

def update_decomposition_pattern_stats(task_id: str, microstep_id: str) -> None:
    """
    Update statistics for decomposition patterns.
    
    Args:
        task_id: ID of the parent task
        microstep_id: ID of the accepted microstep
    """
    try:
        # Get task details from user schedules
        schedules_collection = get_user_schedules_collection()
        task = schedules_collection.find_one(
            {"tasks.id": task_id},
            {"tasks.$": 1}
        )
        
        if not task or not task.get('tasks'):
            return
            
        task_data = task['tasks'][0]
        patterns_collection = get_decomposition_patterns_collection()
        
        # Update pattern statistics
        patterns_collection.update_one(
            {
                'task_text': task_data['text'],
                'categories': task_data.get('categories', [])
            },
            {
                '$inc': {
                    'total_suggestions': 1,
                    'accepted_suggestions': 1
                },
                '$set': {
                    'last_used': datetime.utcnow()
                },
                '$push': {
                    'successful_microsteps': microstep_id
                }
            },
            upsert=True
        )
    except Exception as e:
        print(f"Error updating decomposition patterns: {e}")