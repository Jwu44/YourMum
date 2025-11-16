user_schema_validation = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["googleId", "email", "lastLogin", "createdAt"],
        "properties": {
            "googleId": { "bsonType": "string" },
            "email": { "bsonType": "string" },
            "displayName": { "bsonType": "string" },
            "photoURL": { "bsonType": ["string", "null"] },
            "timezone": { 
                "bsonType": "string",
                "description": "User's timezone in IANA format (e.g., 'Australia/Sydney', 'UTC')"
            },
            "jobTitle": {
                "bsonType": ["string", "null"],
                "maxLength": 50,
                "description": "User's job title (optional, max 50 characters)"
            },
            "age": {
                "bsonType": ["int", "null"],
                "minimum": 1,
                "maximum": 150,
                "description": "User's age (optional, numeric input only)"
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
                        "enum": ["never", "in_progress", "completed", "failed", "disconnected"] 
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
            # Stripe billing and credits fields
            "stripeCustomerId": {
                "bsonType": ["string", "null"],
                "description": "Stripe customer ID for billing"
            },
            "subscriptionId": {
                "bsonType": ["string", "null"],
                "description": "Active Stripe subscription ID"
            },
            "plan": {
                "enum": ["free", "pro"],
                "description": "Current subscription plan"
            },
            "planInterval": {
                "enum": ["month", "year", "null"],
                "description": "Billing interval for pro plans"
            },
            "creditsThisMonth": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Credits available this billing period"
            },
            "nextCreditResetAt": {
                "bsonType": ["date", "null"],
                "description": "When credits will reset for pro users"
            },
            "lifetimeFreeUsed": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Total free credits used across user lifetime"
            },
            # User feedback fields
            "feedbackPromptShown": {
                "bsonType": "bool",
                "description": "Whether the user has seen the feature feedback prompt"
            },
            "feedbackResponse": {
                "bsonType": ["string", "null"],
                "enum": ["thumbs_up", "thumbs_down", "dismissed", "null"],
                "description": "User's response to the feature feedback prompt"
            },
            "feedbackTimestamp": {
                "bsonType": ["date", "null"],
                "description": "When the user responded to the feedback prompt"
            },
            # Recurring task deletion tracking (exclusion pattern)
            "recurringTaskExclusions": {
                "bsonType": "array",
                "description": "List of recurring tasks the user has deleted",
                "items": {
                    "bsonType": "object",
                    "required": ["taskText", "frequency", "excludedAt"],
                    "properties": {
                        "taskText": {
                            "bsonType": "string",
                            "description": "Text content of the deleted recurring task"
                        },
                        "frequency": {
                            "enum": ["daily", "weekly", "monthly"],
                            "description": "Recurrence frequency of the deleted task"
                        },
                        "dayOfWeek": {
                            "bsonType": ["string", "null"],
                            "description": "Day of week for weekly/monthly tasks (e.g., 'Monday')"
                        },
                        "weekOfMonth": {
                            "bsonType": ["string", "null"],
                            "description": "Week of month for monthly tasks (e.g., 'first', 'second')"
                        },
                        "excludedAt": {
                            "bsonType": "date",
                            "description": "Timestamp when the task was deleted"
                        }
                    }
                }
            },
            # Note: Legacy `slack` schema removed. Slack integration data is stored under `slack_integration`.
        }
    }
}