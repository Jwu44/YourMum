from typing import Dict, Any
from datetime import datetime, timezone

schedule_schema_validation = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["userId", "date", "schedule", "metadata"],
        "properties": {
            "userId": { 
                "bsonType": "string",
                "description": "User identifier, should not be null or empty"
            },
            "date": { 
                "bsonType": "string",
                "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$",
                "description": "Date in YYYY-MM-DDTHH:mm:ss format"
            },
            "schedule": {
                "bsonType": "array",
                "description": "Source of truth for tasks - replaces deprecated 'tasks' field",
                "items": {
                    "bsonType": "object",
                    "required": ["id", "text", "type"],
                    "properties": {
                        "id": { "bsonType": "string" },
                        "text": { "bsonType": "string" },
                        "type": { "enum": ["task", "section"] },
                        "categories": {
                            "bsonType": "array",
                            "items": { "bsonType": "string" }
                        },
                        "is_section": { "bsonType": "bool" },
                        "completed": { "bsonType": "bool" },
                        "section": { "bsonType": ["string", "null"] },
                        "parent_id": { "bsonType": ["string", "null"] },
                        "level": { "bsonType": "int" },
                        "section_index": { "bsonType": "int" },
                        "is_subtask": { "bsonType": "bool" },
                        "start_time": { "bsonType": ["string", "null"] },
                        "end_time": { "bsonType": ["string", "null"] },
                        "start_date": { "bsonType": ["string", "null"] },
                        "is_recurring": { "bsonType": ["object", "null"] }
                    }
                }
            },
            "inputs": {
                "bsonType": "object",
                "description": "User preferences used to generate this schedule",
                "properties": {
                    "name": { "bsonType": "string" },
                    "work_start_time": { "bsonType": "string" },
                    "work_end_time": { "bsonType": "string" },
                    "energy_patterns": {
                        "bsonType": "array",
                        "items": { "bsonType": "string" }
                    },
                    "priorities": { "bsonType": "object" },
                    "layout_preference": {
                        "bsonType": "object",
                        "properties": {
                            "layout": { "bsonType": "string" },
                            "subcategory": { "bsonType": "string" },
                            "orderingPattern": { "bsonType": "string" }
                        }
                    },
                    "tasks": {
                        "bsonType": "array",
                        "description": "Input tasks used for generation"
                    }
                }
            },
            "metadata": {
                "bsonType": "object",
                "required": ["created_at", "source"],
                "properties": {
                    "created_at": { "bsonType": "string" },
                    "last_modified": { "bsonType": "string" },
                    "source": { 
                        "enum": ["ai_service", "manual", "calendar_sync"],
                        "description": "Source that created this schedule"
                    }
                }
            }
        }
    }
}

def validate_schedule_document(document: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate a schedule document against the schema.
    
    Args:
        document: The schedule document to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Check required fields
        required_fields = ["userId", "date", "schedule", "metadata"]
        for field in required_fields:
            if field not in document:
                return False, f"Missing required field: {field}"
        
        # Validate userId is not null or empty
        if not document.get("userId") or document["userId"] in [None, "", "null"]:
            return False, "userId cannot be null, empty, or 'null'"
        
        # Validate date format
        date_str = document.get("date", "")
        if not date_str or len(date_str.split("T")) != 2:
            return False, "date must be in YYYY-MM-DDTHH:mm:ss format"
        
        # Validate schedule is array
        if not isinstance(document.get("schedule"), list):
            return False, "schedule must be an array"
        
        # Validate metadata structure
        metadata = document.get("metadata", {})
        if not isinstance(metadata, dict):
            return False, "metadata must be an object"
        
        if "created_at" not in metadata:
            return False, "metadata.created_at is required"
            
        if "source" not in metadata:
            return False, "metadata.source is required"
        
        return True, ""
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"

def get_default_local_user_id() -> str:
    """
    Get default user ID for local development.
    
    Returns:
        Default user ID string for local development
    """
    return "local-dev-user"

def format_schedule_date(date_input: str = None) -> str:
    """
    Format date consistently for schedule storage (YYYY-MM-DDTHH:mm:ss with T00:00:00).
    
    Args:
        date_input: Optional date string. If None, uses current date.
        
    Returns:
        Formatted date string in YYYY-MM-DDTHH:mm:ss format with T00:00:00
    """
    try:
        if date_input:
            # Parse the input date and normalize to T00:00:00
            if 'T' in date_input:
                date_part = date_input.split('T')[0]
            else:
                date_part = date_input
            return f"{date_part}T00:00:00"
        else:
            # Use current date
            current_date = datetime.now().strftime("%Y-%m-%d")
            return f"{current_date}T00:00:00"
    except Exception as e:
        # Fallback to current date if parsing fails
        current_date = datetime.now().strftime("%Y-%m-%d")
        return f"{current_date}T00:00:00"

def format_timestamp() -> str:
    """
    Format current timestamp for metadata fields.
    
    Returns:
        Current timestamp in ISO format
    """
    return datetime.now(timezone.utc).isoformat()