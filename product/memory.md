# Memory and Storage Architecture

## Overview

This document outlines the memory and storage architecture for the YourdAI application. It covers database design, caching strategies, and storage optimization techniques implemented across the system.

## Database Architecture

### MongoDB Collections

The application uses MongoDB as its primary database with the following collection structure:

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | Stores user profiles and authentication data | `googleId`, `email`, `displayName`, `role` |
| `user_schedules` | Stores user scheduling data | `user_id`, `date`, `tasks` |
| `ai_suggestions` | Stores AI-generated schedule suggestions | `user_id`, `date`, `created_at` |
| `microstep_feedback` | Stores user feedback on task decomposition | `user_id`, `task_id`, `feedback` |

### Indexing Strategy

To optimize query performance, we maintain the following indexes:

- `users`: `{ googleId: 1 }` (unique)
- `user_schedules`: `{ user_id: 1, date: 1 }` (compound)
- `ai_suggestions`: `{ user_id: 1, date: 1, created_at: -1 }` (compound)

## Caching Strategy

### Client-Side Caching

- Authentication tokens are cached in the browser's localStorage
- Schedule data is cached in React state with SWR for revalidation
- Static assets are cached via service worker with a cache-first strategy

### Server-Side Caching

- MongoDB query results are cached in-memory for frequently accessed data
- Firebase token verification results are cached to reduce authentication overhead

## Storage Optimization

### Data Serialization

- ObjectId fields are converted to strings for JSON serialization
- Datetime objects are converted to ISO format strings
- Nested objects are flattened where appropriate to reduce document size

### Large Object Handling

For large objects such as user profile images:
- Images are stored as URLs pointing to Firebase Storage
- Binary data is never stored directly in MongoDB documents

## Memory Management

### Backend Memory Considerations

- Flask application is configured with appropriate worker processes based on instance size
- MongoDB connection pooling is implemented to efficiently reuse connections
- Memory-intensive operations (like AI processing) are executed asynchronously

### Frontend Memory Considerations

- React component memoization is used to prevent unnecessary re-renders
- Large lists implement virtualization to render only visible items
- Images are lazy-loaded and properly sized to reduce memory usage

## Backup and Recovery

### Backup Strategy

- MongoDB databases are backed up daily using AWS Backup
- Critical user data is replicated across multiple availability zones
- Database snapshots are retained for 30 days

### Recovery Procedures

In case of data loss:
1. Identify the scope of affected data
2. Restore from the most recent backup
3. Apply transaction logs to recover data since the last backup
4. Verify data integrity before resuming normal operations

## Monitoring and Alerts

- Memory usage is monitored via CloudWatch metrics
- Alerts are configured for:
  - High memory utilization (>85%)
  - Database storage approaching capacity (>80%)
  - Abnormal increases in storage consumption

## Future Improvements

- Implement Redis for more efficient caching
- Explore time-series data optimization for historical schedules
- Consider sharding strategy as user base grows beyond current projections

## Related Documentation

- [Database Schema](./database-schema.md)
- [API Documentation](./api-docs.md)
- [AWS Infrastructure](./aws-infrastructure.md)