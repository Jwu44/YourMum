"""
Timezone Utility Module

Provides robust timezone detection and validation for backend operations.
Ensures reliable timezone handling with intelligent fallbacks and validation.
"""

from typing import Optional
import pytz
from datetime import datetime


def is_valid_timezone(tz: str) -> bool:
    """
    Validate if a timezone string is a valid IANA timezone.
    
    Args:
        tz: Timezone string to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not tz or not isinstance(tz, str):
        return False
        
    # Reject UTC/GMT as they're not real user locations
    if tz.strip().upper() in ['UTC', 'GMT']:
        return False
    
    try:
        # Test if timezone is valid by trying to create timezone object
        pytz.timezone(tz.strip())
        return True
    except (pytz.UnknownTimeZoneError, AttributeError, ValueError):
        return False


def get_reliable_user_timezone(user_timezone: Optional[str]) -> str:
    """
    Get a reliable timezone with smart fallbacks.
    
    Priority order:
    1. User's stored timezone (if valid and not UTC/GMT)
    2. Australia/Sydney (primary location fallback)
    
    Args:
        user_timezone: User's stored timezone preference
        
    Returns:
        Reliable IANA timezone string
    """
    # Fallback chain
    candidates = [
        user_timezone,
        'Australia/Sydney',  # Primary location fallback
    ]
    
    for candidate in candidates:
        if candidate and is_valid_timezone(candidate):
            return candidate.strip()
    
    # Final safety fallback
    return 'Australia/Sydney'


def get_calendar_timezone(user_timezone: Optional[str]) -> str:
    """
    Get timezone safe for calendar operations.
    
    Ensures we never use UTC for user-facing calendar operations
    as UTC is not a real user location.
    
    Args:
        user_timezone: User's stored timezone
        
    Returns:
        Timezone safe for calendar operations
    """
    reliable = get_reliable_user_timezone(user_timezone)
    
    # Extra safety: never return UTC for calendar operations
    if reliable.upper() in ['UTC', 'GMT']:
        return 'Australia/Sydney'
    
    return reliable


def should_update_user_timezone(current_timezone: Optional[str], detected_timezone: str) -> bool:
    """
    Determine if user's timezone should be updated.
    
    Args:
        current_timezone: User's current stored timezone
        detected_timezone: Newly detected timezone
        
    Returns:
        True if update is recommended, False otherwise
    """
    # Always update if current is invalid or UTC/GMT
    if not current_timezone or current_timezone.strip().upper() in ['UTC', 'GMT']:
        return True
    
    # Update if detected timezone is different and valid
    if detected_timezone != current_timezone and is_valid_timezone(detected_timezone):
        return True
    
    # No update needed
    return False


def validate_timezone_update(timezone_value: str) -> tuple[bool, Optional[str]]:
    """
    Validate a timezone value for user updates.
    
    Args:
        timezone_value: Timezone string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not timezone_value or not isinstance(timezone_value, str):
        return False, "Timezone value is required"
    
    cleaned_tz = timezone_value.strip()
    
    if not cleaned_tz:
        return False, "Timezone value cannot be empty"
    
    # Reject UTC/GMT as user timezones
    if cleaned_tz.upper() in ['UTC', 'GMT']:
        return False, "UTC and GMT are not valid user timezones. Please specify your actual location timezone."
    
    if not is_valid_timezone(cleaned_tz):
        return False, f"Invalid timezone: {cleaned_tz}. Please use a valid IANA timezone identifier."
    
    return True, None


def get_user_timezone_for_date_calculation(user_doc: dict) -> str:
    """
    Get timezone for date calculations (like "today" computation).
    
    Used by calendar webhooks and schedule operations to ensure
    accurate date boundaries in user's local time.
    
    Args:
        user_doc: User document from database
        
    Returns:
        Reliable timezone for date calculations
    """
    user_timezone = user_doc.get('timezone')
    return get_calendar_timezone(user_timezone)


def format_date_in_timezone(dt: datetime, timezone_str: str) -> str:
    """
    Format a datetime as YYYY-MM-DD in the specified timezone.
    
    Args:
        dt: DateTime object to format
        timezone_str: Target timezone
        
    Returns:
        Date string in YYYY-MM-DD format
    """
    try:
        tz = pytz.timezone(timezone_str)
        local_dt = dt.astimezone(tz)
        return local_dt.strftime('%Y-%m-%d')
    except Exception:
        # Fallback to UTC
        return dt.strftime('%Y-%m-%d')


def get_today_in_user_timezone(user_timezone: Optional[str]) -> str:
    """
    Get today's date in user's timezone.
    
    Args:
        user_timezone: User's timezone preference
        
    Returns:
        Today's date in YYYY-MM-DD format
    """
    reliable_tz = get_reliable_user_timezone(user_timezone)
    now_utc = datetime.utcnow().replace(tzinfo=pytz.UTC)
    return format_date_in_timezone(now_utc, reliable_tz)