# SMS History & Filtering Feature Documentation

## Overview

The SMS History & Filtering feature enables users to view, search, and analyze their SMS sending history with advanced filtering, pagination, and aggregation capabilities. This feature provides users with powerful tools to track, manage, and gain insights into their SMS campaigns.

## Features

### 1. **Advanced SMS History Retrieval**
- View complete SMS sending history with full details
- Support for multiple filtering criteria
- Pagination with customizable page size
- Multiple sort options

### 2. **Advanced Filtering Capabilities**
- Filter by delivery status (pending, sent, delivered, failed, bounced)
- Filter by SMS provider (nexmo, mailgun, twilio)
- Filter by date range (start and end dates)
- Filter by recipient phone number
- Search in message content
- Quick filters (onlyFailed, onlyDelivered, onlyPending)

### 3. **Text Search**
- Full-text search across message content
- Recipient phone number matching
- Case-insensitive search

### 4. **SMS History Summary**
- Breakdown by delivery status
- Breakdown by provider
- Daily statistics with delivery rates

### 5. **Pagination Support**
- Customizable limit (default: 20)
- Offset-based pagination
- Page information in responses
- "hasMore" flag for infinite scroll

## API Endpoints

### 1. GET `/api/sms/history`

Retrieve SMS history with advanced filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Number of results per page (1-100) |
| `offset` | number | 0 | Pagination offset |
| `status` | string | null | Filter by delivery status: `pending`, `sent`, `delivered`, `failed`, `bounced` |
| `provider` | string | null | Filter by provider: `nexmo`, `mailgun`, `twilio` |
| `startDate` | string (ISO) | null | Filter messages from this date onwards (ISO 8601 format) |
| `endDate` | string (ISO) | null | Filter messages until this date (ISO 8601 format) |
| `recipient` | string | null | Filter by recipient phone number (partial match) |
| `search` | string | null | Search in message content (case-insensitive) |
| `sortBy` | string | `created_at` | Sort field: `created_at`, `sent_at`, `delivered_at`, `delivery_status` |
| `sortOrder` | string | `desc` | Sort order: `asc` or `desc` |
| `onlyFailed` | boolean | false | Show only failed/bounced messages |
| `onlyDelivered` | boolean | false | Show only delivered messages |
| `onlyPending` | boolean | false | Show only pending messages |

#### Authentication

Required: JWT Token (Bearer authentication)

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/sms/history?limit=20&offset=0&status=delivered&provider=nexmo&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 8,
    "hasMore": true
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "victim": "+1234567890",
      "message": "Hello! This is a test SMS message...",
      "messageLength": 45,
      "numberOfParts": 1,
      "delivery_status": "delivered",
      "provider_used": "nexmo",
      "created_at": "2024-01-15T10:30:00Z",
      "sent_at": "2024-01-15T10:30:05Z",
      "delivered_at": "2024-01-15T10:30:15Z",
      "error_reason": null,
      "error_code": null,
      "cost": 0.067,
      "currency": "USD"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "victim": "+9876543210",
      "message": "Verification code: 123456...",
      "messageLength": 32,
      "numberOfParts": 1,
      "delivery_status": "failed",
      "provider_used": "nexmo",
      "created_at": "2024-01-15T10:25:00Z",
      "sent_at": "2024-01-15T10:25:05Z",
      "delivered_at": null,
      "error_reason": "Invalid number",
      "error_code": "1",
      "cost": null,
      "currency": null
    }
  ]
}
```

#### Status Codes

- `200 OK` - Successfully retrieved SMS history
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Missing or invalid JWT token
- `500 Internal Server Error` - Server error

---

### 2. GET `/api/sms/history/search`

Advanced text search in SMS history with search term highlighting.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (searches in message content and recipient) |
| `limit` | number | No | Results per page (default: 20) |
| `offset` | number | No | Pagination offset (default: 0) |

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/sms/history/search?q=verification&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "query": "verification",
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 0,
    "page": 1,
    "totalPages": 5
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "victim": "+1234567890",
      "message": "Verification code: 123456. Valid for 10 minutes.",
      "delivery_status": "delivered",
      "provider_used": "nexmo",
      "created_at": "2024-01-15T10:30:00Z",
      "matchContext": {
        "messageSnippet": "Verification code: 123456. Valid for 10 minutes."
      }
    }
  ]
}
```

#### Status Codes

- `200 OK` - Search completed successfully
- `400 Bad Request` - Missing search query parameter
- `401 Unauthorized` - Missing or invalid JWT token
- `500 Internal Server Error` - Server error

---

### 3. GET `/api/sms/history/summary`

Get aggregated SMS history statistics with breakdowns by status, provider, and daily stats.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (ISO) | Filter statistics from this date onwards |
| `endDate` | string (ISO) | Filter statistics until this date |
| `provider` | string | Filter statistics for specific provider |

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/sms/history/summary?startDate=2024-01-01&endDate=2024-01-31&provider=nexmo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response

```json
{
  "success": true,
  "summary": {
    "byStatus": [
      {
        "_id": "delivered",
        "count": 450
      },
      {
        "_id": "pending",
        "count": 25
      },
      {
        "_id": "failed",
        "count": 15
      }
    ],
    "byProvider": [
      {
        "_id": "nexmo",
        "count": 420
      },
      {
        "_id": "mailgun",
        "count": 70
      }
    ],
    "dailyStats": [
      {
        "_id": "2024-01-15",
        "count": 95,
        "delivered": 90,
        "failed": 5
      },
      {
        "_id": "2024-01-14",
        "count": 120,
        "delivered": 115,
        "failed": 5
      }
    ]
  }
}
```

#### Status Codes

- `200 OK` - Statistics retrieved successfully
- `401 Unauthorized` - Missing or invalid JWT token
- `500 Internal Server Error` - Server error

---

## Use Cases

### 1. **Track Delivery Status**
```bash
# Get all delivered messages
curl "http://localhost:5000/api/sms/history?status=delivered"

# Get all failed messages
curl "http://localhost:5000/api/sms/history?onlyFailed=true"
```

### 2. **Time-based Filtering**
```bash
# Get messages from January 2024
curl "http://localhost:5000/api/sms/history?startDate=2024-01-01&endDate=2024-01-31"

# Get today's messages
curl "http://localhost:5000/api/sms/history?startDate=2024-01-15&endDate=2024-01-15"
```

### 3. **Provider Analysis**
```bash
# Get all Nexmo messages
curl "http://localhost:5000/api/sms/history?provider=nexmo"

# Compare providers
curl "http://localhost:5000/api/sms/history/summary"
```

### 4. **Recipient Tracking**
```bash
# Find all messages to a specific number
curl "http://localhost:5000/api/sms/history?recipient=%2B1234567890"

# Find messages to any number containing 123
curl "http://localhost:5000/api/sms/history?recipient=123"
```

### 5. **Message Search**
```bash
# Find all verification codes
curl "http://localhost:5000/api/sms/history/search?q=verification"

# Find all promotional messages
curl "http://localhost:5000/api/sms/history/search?q=promotion"
```

### 6. **Combined Filtering**
```bash
# Get failed verification messages from nexmo in the last week
curl "http://localhost:5000/api/sms/history?status=failed&provider=nexmo&search=verification&startDate=2024-01-08&endDate=2024-01-15"
```

---

## Service Methods

The SMS History & Filtering feature uses the following service methods in `services/deliveryStatus.js`:

### `getAdvancedSmsHistory(username, filters)`

Enhanced SMS history retrieval with advanced filtering.

**Parameters:**
- `username` (string): User's username
- `filters` (object): Filter configuration
  - `limit` (number): Results per page
  - `offset` (number): Pagination offset
  - `status` (string): Delivery status filter
  - `provider` (string): Provider filter
  - `startDate` (Date): Start date filter
  - `endDate` (Date): End date filter
  - `recipientPhone` (string): Recipient phone filter
  - `messageContent` (string): Message search term
  - `sortBy` (string): Sort field
  - `sortOrder` (number): 1 for ascending, -1 for descending
  - `onlyFailed` (boolean): Show only failed messages
  - `onlyDelivered` (boolean): Show only delivered messages
  - `onlyPending` (boolean): Show only pending messages

**Returns:** Paginated results with metadata

---

### `getSmsHistorySummary(username, filters)`

Get aggregated SMS statistics.

**Parameters:**
- `username` (string): User's username
- `filters` (object): Filter configuration
  - `startDate` (Date): Start date for statistics
  - `endDate` (Date): End date for statistics
  - `provider` (string): Provider filter

**Returns:** Summary object with status breakdown, provider breakdown, and daily statistics

---

## Implementation Details

### Filtering Logic

1. **Status Filtering**: Direct equality check against `delivery_status` field
2. **Provider Filtering**: Direct equality check against `provider_used` field
3. **Date Range**: MongoDB `$gte` and `$lte` operators for date range queries
4. **Phone Number Filtering**: Case-insensitive regex pattern matching
5. **Message Search**: Case-insensitive regex pattern matching across message content
6. **Quick Filters**: Maps to multiple status values (e.g., `onlyFailed` → `['failed', 'bounced']`)

### Pagination

- Uses MongoDB `skip()` and `limit()` for efficient pagination
- Calculates `totalPages` and `hasMore` flag for client-side navigation
- Returns current `page` number for easier UX

### Sorting

- Supports sorting by multiple fields: `created_at`, `sent_at`, `delivered_at`, `delivery_status`
- Configurable sort order: ascending (1) or descending (-1)
- Default: newest messages first (descending by `created_at`)

### Search

- Case-insensitive using MongoDB regex `$options: 'i'`
- Searches across both message content and recipient phone numbers
- Returns matching snippets for context

---

## Security Considerations

1. **User Isolation**: All queries are filtered by username to ensure users only see their own SMS history
2. **Authentication**: All endpoints require JWT authentication
3. **Authorization**: User ownership is validated before returning results
4. **Input Validation**: Query parameters are validated and sanitized
5. **No Data Leakage**: Error messages don't expose system internals

---

## Performance Optimization

### Indexes

The `Log` model includes indexes on:
- `username` - For faster user-specific queries
- `created_at` - For sorting and date range queries
- `provider_used` - For provider filtering
- `delivery_status` - For status filtering
- Combined index on `username + created_at` - For common query pattern

### Query Optimization

1. **Selective Field Projection**: Only necessary fields are returned
2. **Aggregation Pipeline**: Uses MongoDB aggregation for summary statistics
3. **Pagination**: Prevents loading entire result sets
4. **Compound Queries**: Combines multiple filters into single database query

---

## Error Handling

| Error | Status Code | Message |
|-------|-------------|---------|
| Missing search query | 400 | "Search query (q) is required" |
| Invalid JWT token | 401 | (Standard authentication error) |
| Database error | 500 | Error message from service |
| Invalid date format | 400 | "Invalid date format" |

---

## Future Enhancements

1. **Export Functionality**: Export SMS history to CSV/PDF
2. **Scheduled Reports**: Automatic generation of SMS statistics reports
3. **Alerts**: Set up alerts for delivery failures
4. **Advanced Analytics**: Delivery trends, peak times analysis
5. **Batch Operations**: Bulk actions on filtered results
6. **Custom Date Presets**: "Last 7 days", "This month", etc.
7. **SMS Template History**: Track template usage

---

## Examples

### Node.js/Axios Example

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`
  }
});

// Get delivered messages from this month
async function getMonthlyDelivered() {
  const response = await api.get('/api/sms/history', {
    params: {
      status: 'delivered',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      limit: 50
    }
  });
  return response.data;
}

// Search for verification codes
async function searchVerificationCodes() {
  const response = await api.get('/api/sms/history/search', {
    params: {
      q: 'verification',
      limit: 20
    }
  });
  return response.data;
}

// Get statistics for this week
async function getWeeklyStats() {
  const response = await api.get('/api/sms/history/summary', {
    params: {
      startDate: '2024-01-08',
      endDate: '2024-01-15'
    }
  });
  return response.data;
}
```

### JavaScript/Fetch Example

```javascript
const JWT_TOKEN = 'your_jwt_token_here';

async function fetchSmsHistory(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, value);
    }
  });

  const response = await fetch(
    `http://localhost:5000/api/sms/history?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    }
  );

  return response.json();
}

// Usage
fetchSmsHistory({
  status: 'delivered',
  provider: 'nexmo',
  limit: 20,
  sortOrder: 'desc'
}).then(data => console.log(data));
```

---

## Related Documentation

- [SMS Delivery Tracking](./SMS_DELIVERY_TRACKING.md)
- [Rate Limiting](./RATE_LIMITING.md)
- [API Documentation](./README.md)
- [User Profile Update](./USER_PROFILE_UPDATE.md)

