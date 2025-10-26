# Request Logging Middleware Documentation

## Overview

The Request Logging Middleware provides comprehensive logging of all API requests for auditing, debugging, monitoring, and analytics purposes. Every API call is automatically logged with detailed information including method, route, response time, status code, and user information.

## Features

### 1. **Automatic Request Logging**
- Captures all API requests automatically
- Records method, route, URL, query parameters
- Tracks request body (sanitized for security)
- Stores safe headers and client information

### 2. **Response Tracking**
- Records HTTP status code
- Measures response time (in milliseconds)
- Tracks response size (in bytes)
- Captures error information on failures

### 3. **User & Client Information**
- Extracts authenticated user information
- Records client IP address (handles proxies)
- Captures user agent
- Environment information

### 4. **Data Security & Sanitization**
- Automatically redacts sensitive fields (passwords, tokens, API keys)
- Only stores safe headers (user-agent, content-type, etc.)
- Removes authorization headers
- Prevents logging of credit card info, SSNs, etc.

### 5. **Analytics & Insights**
- Request statistics by HTTP method
- Status code distribution
- Response time analysis (avg, min, max)
- Hourly traffic patterns
- Route-specific metrics
- Slow request identification

### 6. **Error Tracking**
- Dedicated error log filtering (status >= 400)
- Error cause analysis
- Stack trace storage
- Error rate calculations

### 7. **User Activity Audit Trail**
- Track all user activities
- User-specific activity logs
- Time-based filtering
- Audit trail for compliance

### 8. **Data Retention**
- Automatic cleanup of old logs
- TTL index for automatic deletion (default: 30 days)
- Manual cleanup available

---

## Architecture

### Data Flow

```
API Request
    ↓
Request Logging Middleware (captures request start time)
    ↓
Express Route Handler
    ↓
Response interceptor (captures response details)
    ↓
RequestLoggingService.createRequestLog() (async)
    ↓
MongoDB RequestLog Collection
    ↓
Response sent to client
```

### Components

1. **Middleware** (`middleware/requestLogger.js`)
   - Intercepts all requests and responses
   - Measures response time
   - Extracts request/response data
   - Triggers async logging

2. **Service** (`services/requestLogger.js`)
   - Sanitizes sensitive data
   - Creates log documents
   - Provides query/analytics methods
   - Handles cleanup

3. **Model** (`model/RequestLog.js`)
   - MongoDB schema for request logs
   - Indexes for efficient querying
   - TTL index for automatic cleanup
   - Fields for comprehensive logging

4. **Routes** (`routes/api/logs.js`)
   - API endpoints for log retrieval
   - Statistics and analytics endpoints
   - Error log access
   - User activity tracking

---

## Database Schema

### RequestLog Collection

```javascript
{
  _id: ObjectId,
  
  // Request Information
  method: String,           // GET, POST, PUT, PATCH, DELETE, etc.
  route: String,            // API route/path
  url: String,              // Full URL with query string
  queryParams: Object,      // Query parameters
  requestBody: Object,      // Request body (sanitized)
  requestHeaders: Object,   // Safe headers only
  
  // User Information
  username: String,         // Authenticated user (if applicable)
  clientIp: String,         // Client IP address
  userAgent: String,        // Browser/Client user agent
  
  // Response Information
  statusCode: Number,       // HTTP status code
  responseSize: Number,     // Response size in bytes
  responseTime: Number,     // Response time in ms
  
  // Error Information (if applicable)
  error: {
    message: String,
    code: String,
    stack: String
  },
  
  // Metadata
  timestamp: Date,          // Request timestamp
  createdAt: Date,          // Document creation date
  environment: String,      // Environment (production, dev, etc.)
  version: String           // API version (optional)
}
```

### Indexes

- `method` - For filtering by HTTP method
- `route` - For filtering by API route
- `statusCode` - For filtering by response code
- `timestamp` - For sorting and date filtering
- `username` - For user activity queries
- `clientIp` - For IP-based analysis
- `(username, timestamp)` - For user activity queries
- `(route, timestamp)` - For route-specific analysis
- `(statusCode, timestamp)` - For error analysis
- `(method, route, timestamp)` - Combined query optimization
- `(clientIp, timestamp)` - For IP tracking
- TTL Index on `timestamp` - Auto-delete after 30 days

---

## API Endpoints

### 1. GET `/api/logs/requests`

Retrieve request logs with comprehensive filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Results per page (1-500) |
| `offset` | number | 0 | Pagination offset |
| `method` | string | null | Filter by HTTP method (GET, POST, etc.) |
| `route` | string | null | Filter by route (regex pattern) |
| `statusCode` | number | null | Filter by HTTP status code |
| `username` | string | null | Filter by authenticated user |
| `clientIp` | string | null | Filter by client IP address |
| `startDate` | string (ISO) | null | Filter from start date |
| `endDate` | string (ISO) | null | Filter until end date |
| `sortBy` | string | `timestamp` | Sort field |
| `sortOrder` | string | `desc` | Sort order: `asc` or `desc` |

#### Authentication

Required: JWT Token (Bearer)

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/logs/requests?limit=20&statusCode=200" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "pagination": {
    "total": 1250,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 63,
    "hasMore": true
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "method": "POST",
      "route": "/api/users/register",
      "url": "/api/users/register",
      "statusCode": 200,
      "responseTime": 145,
      "username": null,
      "clientIp": "192.168.1.1",
      "timestamp": "2024-01-15T10:30:00Z",
      "error": null
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "method": "GET",
      "route": "/api/sms/history",
      "url": "/api/sms/history?limit=20&status=delivered",
      "statusCode": 200,
      "responseTime": 234,
      "username": "john_doe",
      "clientIp": "192.168.1.2",
      "timestamp": "2024-01-15T10:29:45Z",
      "error": null
    }
  ]
}
```

---

### 2. GET `/api/logs/requests/:logId`

Retrieve detailed information about a specific request log.

#### Parameters

- `logId` (URL) - The request log ID

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/logs/requests/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "method": "POST",
    "route": "/api/users/register",
    "url": "/api/users/register",
    "queryParams": {},
    "requestBody": {
      "name": "John Doe",
      "username": "john_doe",
      "email": "john@example.com",
      "password": "[REDACTED]",
      "confirm_password": "[REDACTED]"
    },
    "requestHeaders": {
      "user-agent": "Mozilla/5.0...",
      "accept": "application/json"
    },
    "statusCode": 200,
    "responseSize": 512,
    "responseTime": 145,
    "username": null,
    "clientIp": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-15T10:30:00Z",
    "error": null
  }
}
```

---

### 3. GET `/api/logs/requests/stats/overview`

Get comprehensive request statistics and analytics.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (ISO) | Statistics from this date |
| `endDate` | string (ISO) | Statistics until this date |
| `method` | string | Filter by HTTP method |
| `route` | string | Filter by route |

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/logs/requests/stats/overview?startDate=2024-01-01&endDate=2024-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "stats": {
    "overallStats": {
      "totalRequests": 15420,
      "totalResponseTime": 3524680,
      "totalResponseSize": 45620000,
      "avgResponseTime": 228.5,
      "avgResponseSize": 2958,
      "minResponseTime": 12,
      "maxResponseTime": 5420
    },
    "byMethod": [
      {
        "_id": "GET",
        "count": 8240,
        "avgResponseTime": 145
      },
      {
        "_id": "POST",
        "count": 4320,
        "avgResponseTime": 289
      }
    ],
    "byStatusCode": [
      {
        "_id": 200,
        "count": 13800,
        "percentage": 89.5
      },
      {
        "_id": 400,
        "count": 890,
        "percentage": 5.8
      },
      {
        "_id": 401,
        "count": 430,
        "percentage": 2.8
      },
      {
        "_id": 500,
        "count": 300,
        "percentage": 1.9
      }
    ],
    "byRoute": [
      {
        "_id": "/api/sms/send",
        "count": 4520,
        "avgResponseTime": 312,
        "errors": 45
      },
      {
        "_id": "/api/users/login",
        "count": 2890,
        "avgResponseTime": 156,
        "errors": 320
      }
    ],
    "slowRequests": [
      {
        "route": "/api/sms/history",
        "method": "GET",
        "responseTime": 5420,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "hourlyStats": [
      {
        "_id": "2024-01-15 10:00",
        "count": 420,
        "avgResponseTime": 198,
        "errors": 12
      }
    ]
  }
}
```

---

### 4. GET `/api/logs/errors`

Retrieve error logs (requests with status code >= 400).

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Results per page |
| `offset` | number | 0 | Pagination offset |
| `startDate` | string (ISO) | null | Filter from start date |
| `endDate` | string (ISO) | null | Filter until end date |
| `statusCodeMin` | number | 400 | Minimum status code |

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/logs/errors?limit=20&statusCodeMin=500" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "pagination": {
    "total": 320,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 16,
    "hasMore": true
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "method": "POST",
      "route": "/api/sms/send",
      "url": "/api/sms/send",
      "statusCode": 500,
      "responseTime": 2340,
      "username": "john_doe",
      "clientIp": "192.168.1.1",
      "timestamp": "2024-01-15T10:15:00Z",
      "error": {
        "message": "Provider connection timeout",
        "code": "ETIMEDOUT"
      }
    }
  ]
}
```

---

### 5. GET `/api/logs/activity/user/:username`

Retrieve activity logs for a specific user.

#### Parameters

- `username` (URL) - Username to retrieve activity for

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Results per page |
| `offset` | number | 0 | Pagination offset |
| `startDate` | string (ISO) | null | Filter from start date |
| `endDate` | string (ISO) | null | Filter until end date |

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/logs/activity/user/john_doe?limit=20&startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "username": "john_doe",
  "pagination": {
    "total": 245,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 13,
    "hasMore": true
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "method": "POST",
      "route": "/api/sms/send",
      "url": "/api/sms/send",
      "statusCode": 200,
      "responseTime": 234,
      "clientIp": "192.168.1.1",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 6. DELETE `/api/logs/cleanup`

Clean up request logs older than specified number of days.

#### Request Body

```json
{
  "daysOld": 30
}
```

#### Query Parameters

- `daysOld` (body) - Delete logs older than this many days (1-365, default: 30)

#### Example Request

```bash
curl -X DELETE "http://localhost:5000/api/logs/cleanup" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 30}'
```

#### Response

```json
{
  "success": true,
  "message": "Deleted 15420 logs older than 30 days",
  "deletedCount": 15420
}
```

---

## Security & Sanitization

### Sensitive Fields Automatically Redacted

The following fields are automatically redacted with `[REDACTED]`:

- password
- token
- authorization
- api_key / apiKey
- secret
- creditCard / cardNumber
- cvv
- ssn
- privateKey
- refreshToken

### Safe Headers Only

Only the following headers are logged:

- user-agent
- accept
- accept-language
- accept-encoding
- content-type
- content-length
- referer
- origin
- host

Authorization and other sensitive headers are excluded.

### Request Body Exclusions

For GET, HEAD, and DELETE requests, request body is not logged.

---

## Use Cases

### 1. **Debug API Issues**
```bash
# Find all failed requests for a specific route
curl "http://localhost:5000/api/logs/requests?route=/api/sms/send&statusCodeMin=400"
```

### 2. **Performance Analysis**
```bash
# Get slowest requests
curl "http://localhost:5000/api/logs/requests/stats/overview"
# Check maxResponseTime in slowRequests section
```

### 3. **User Activity Audit**
```bash
# Track all activities of a user
curl "http://localhost:5000/api/logs/activity/user/john_doe"
```

### 4. **Error Investigation**
```bash
# Get all errors from today
curl "http://localhost:5000/api/logs/errors?startDate=2024-01-15&endDate=2024-01-15"
```

### 5. **API Monitoring**
```bash
# Get statistics for the last week
curl "http://localhost:5000/api/logs/requests/stats/overview?startDate=2024-01-08&endDate=2024-01-15"
```

### 6. **Compliance Audit Trail**
```bash
# Get all user registrations
curl "http://localhost:5000/api/logs/requests?route=/api/users/register"
```

---

## Performance Considerations

### Response Time Overhead

- Logging is **asynchronous** - does not block API responses
- Typical logging overhead: < 1-2ms

### Database Performance

- Efficient indexes on common query patterns
- TTL index automatically removes old logs
- Pagination prevents loading entire collections
- Aggregation pipeline for statistics calculations

### Storage Optimization

- Only essential data logged
- Sensitive fields sanitized (reduces storage)
- Automatic cleanup after 30 days

---

## Configuration

### Environment Variables

```bash
NODE_ENV=production  # Environment setting for logs
PORT=5000            # API port
```

### Middleware Registration

The request logging middleware should be registered early in your Express app:

```javascript
app.use(requestLoggingMiddleware())
```

### TTL Index

Documents automatically deleted after 30 days via TTL index.

Manual cleanup:
```bash
DELETE /api/logs/cleanup
Body: { "daysOld": 30 }
```

---

## Monitoring & Alerts

### Recommended Metrics to Monitor

1. **Error Rate**: `(errors / total_requests) * 100`
2. **Average Response Time**: `totalResponseTime / totalRequests`
3. **Slow Request Rate**: Requests > 1000ms
4. **Status Code Distribution**: Percentage of 4xx vs 5xx errors
5. **Request Volume**: Requests per hour/minute

### Alert Thresholds

- Error rate > 5%
- Average response time > 500ms
- 5xx errors detected
- Repeated failed attempts from same IP

---

## Best Practices

1. **Regular Cleanup**: Schedule monthly cleanup of old logs
2. **Admin Access Only**: Restrict `/api/logs/*` to admin users only
3. **User Privacy**: Regularly review logged data for privacy compliance
4. **Monitoring**: Set up alerts for error rates and performance issues
5. **Backup**: Archive logs periodically for long-term retention
6. **Sensitive Data**: Audit sanitization rules regularly

---

## Troubleshooting

### Logs Not Being Created

1. Check middleware is registered in `app.js`
2. Verify MongoDB connection
3. Check application logs for errors

### High Storage Usage

1. Reduce retention period: `DELETE /api/logs/cleanup?daysOld=7`
2. Verify TTL index exists: `db.request_logs.getIndexes()`
3. Monitor log size: `db.request_logs.stats().size`

### Slow Query Performance

1. Verify indexes exist on queried fields
2. Adjust pagination limit (lower = faster)
3. Use startDate/endDate to reduce query scope

---

## Future Enhancements

1. **Log Aggregation**: Ship logs to external logging service (ELK, Splunk)
2. **Real-time Alerts**: WebSocket alerts for critical events
3. **Log Export**: Export logs to CSV/JSON
4. **Advanced Analytics**: Machine learning for anomaly detection
5. **Dashboard**: Real-time monitoring dashboard
6. **Rate Limiting Rules**: Auto-generate rules based on patterns
7. **Replay Functionality**: Replay failed requests for debugging

---

## Related Documentation

- [Rate Limiting](./RATE_LIMITING.md)
- [SMS Delivery Tracking](./SMS_DELIVERY_TRACKING.md)
- [SMS History & Filtering](./SMS_HISTORY_FILTERING.md)
- [User Profile Update](./USER_PROFILE_UPDATE.md)
- [API Documentation](./README.md)

