user_schema_validation = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["googleId", "email", "role", "lastLogin", "createdAt"],
        "properties": {
            "googleId": { "bsonType": "string" },
            "email": { "bsonType": "string" },
            "displayName": { "bsonType": "string" },
            "photoURL": { "bsonType": ["string", "null"] },
            "role": { "enum": ["free", "premium", "admin"] },
            "timezone": { 
                "bsonType": "string",
                "description": "User's timezone in IANA format (e.g., 'Australia/Sydney', 'UTC')"
            },
            "lastLogin": { "bsonType": "date" },
            "createdAt": { "bsonType": "date" },
            # Add calendar-related fields
            "calendar": {
                "bsonType": "object",
                "properties": {
                    "connected": { "bsonType": "bool" },
                    "lastSyncTime": { "bsonType": ["date", "null"] },
                    "syncStatus": { 
                        "enum": ["never", "in_progress", "completed", "failed"] 
                    },
                    "selectedCalendars": {
                        "bsonType": "array",
                        "items": { "bsonType": "string" }
                    },
                    "credentials": {
                        "bsonType": "object",
                        "properties": {
                            "accessToken": { "bsonType": "string" },
                            "refreshToken": { "bsonType": "string" },
                            "expiresAt": { "bsonType": "date" },
                            "scopes": {
                                "bsonType": "array",
                                "items": { "bsonType": "string" }
                            }
                        }
                    }
                }
            },
            # Add Slack integration fields
            "slack": {
                "bsonType": "object",
                "properties": {
                    "connected": { "bsonType": "bool" },
                    "instanceId": { "bsonType": ["string", "null"] },
                    "serverUrl": { "bsonType": ["string", "null"] },
                    "oauthUrl": { "bsonType": ["string", "null"] },
                    "connectedAt": { "bsonType": ["date", "null"] },
                    "lastSyncTime": { "bsonType": ["date", "null"] }
                }
            }
        }
    }
}