# Real-time Notifications & SMS Webhooks Documentation

## Overview

The Real-time Notifications feature enables users to receive real-time updates about SMS delivery status through HTTP webhooks. Whenever an SMS is sent, delivered, failed, or bounced, the system automatically sends an HTTP POST request to user-configured webhook URLs with detailed information about the event.

## Features

### 1. **Webhook Management**
- Create, read, update, and delete webhooks
- Manage multiple webhooks per user
- Enable/disable webhooks without deleting
- Descriptive names and descriptions for organization

### 2. **Event Subscriptions**
- Subscribe to specific event types:
  - `sms.sent` - SMS successfully sent to provider
  - `sms.delivered` - SMS delivered to recipient
  - `sms.failed` - SMS delivery failed
  - `sms.bounced` - Invalid number or network issue
  - `sms.read` - SMS read by recipient (future)

### 3. **Security**
- HMAC-SHA256 signature verification
- Secure secret generation and rotation
- Payload size limits
- Timezone-safe timestamp handling

### 4. **Reliability**
- Automatic retry logic with exponential backoff
- Configurable retry attempts (1-10)
- Configurable backoff interval
- Failed event logging and history
- Event status tracking

### 5. **Monitoring & Analytics**
- Webhook statistics (total calls, success rate, failure count)
- Event logs with filtering and pagination
- Average response time tracking
- Last call status tracking

### 6. **Testing**
- Send test webhook payloads
- Verify webhook configuration before production
- Test payload includes all required fields

### 7. **Webhook Events**
- Event queuing for reliability
- Async processing (non-blocking)
- TTL-based automatic cleanup (90 days)

---

## Architecture

### Webhook Flow Diagram

```
SMS Event Occurs (sent/delivered/failed/bounced)
    ↓
DeliveryStatusService.updateDeliveryStatus()
    ↓
WebhookService.triggerEvent()
    ↓
Find all active webhooks subscribed to event
    ↓
WebhookService.queueWebhookEvent() [async]
    ↓
WebhookEvent created in DB (status: pending)
    ↓
WebhookService.sendWebhookEvent() [async]
    ↓
HTTP POST to webhook URL with signed payload
    ↓
    ├─ Success (2xx/3xx) → Update stats, mark success
    ├─ Failure → Schedule retry with exponential backoff
    └─ Max retries exceeded → Mark as failed
```

---

## Database Schema

### Webhook Collection

```javascript
{
  _id: ObjectId,
  username: String,              // User who owns webhook
  url: String,                   // Webhook endpoint URL
  name: String,                  // Webhook name/description
  description: String,           // Longer description
  events: [String],             // Subscribed event types
  secret: String,               // HMAC secret for signatures
  isActive: Boolean,            // Webhook active status
  retryEnabled: Boolean,        // Enable retry logic
  retryCount: Number,           // Max retry attempts (1-10)
  retryBackoffMs: Number,       // Backoff interval in ms
  notifyOnFailure: Boolean,     // Notify on delivery failure
  maxPayloadSize: Number,       // Max payload size
  stats: {
    totalCalls: Number,
    successfulCalls: Number,
    failedCalls: Number,
    lastCall: Date,
    lastCallStatus: Number,
    averageResponseTime: Number
  },
  created_at: Date,
  updated_at: Date,
  lastUpdatedBy: String
}
```

### WebhookEvent Collection

```javascript
{
  _id: ObjectId,
  webhookId: ObjectId,          // Reference to Webhook
  logId: ObjectId,              // Reference to SMS Log
  eventType: String,            // Event type (sms.sent, etc.)
  payload: Mixed,               // Event payload
  status: String,               // pending/sent/failed/success
  httpStatusCode: Number,       // HTTP response code
  httpResponseBody: String,     // HTTP response body
  attempts: Number,             // Retry attempts made
  maxAttempts: Number,          // Max attempts allowed
  lastAttemptTime: Date,        // Last attempt timestamp
  lastAttemptError: String,     // Last error message
  nextRetryTime: Date,          // Scheduled next retry
  requestDurationMs: Number,    // Request duration
  signature: String,            // HMAC signature
  createdAt: Date,
  sentAt: Date
}
```

---

## API Endpoints

### 1. POST `/api/webhooks`

Create a new webhook.

#### Request Body

```json
{
  "url": "https://your-domain.com/webhook",
  "name": "Order Status Updates",
  "description": "Receive SMS delivery notifications",
  "events": ["sms.delivered", "sms.failed"],
  "retryCount": 3,
  "retryBackoffMs": 5000,
  "notifyOnFailure": true
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "msg": "Webhook created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "url": "https://your-domain.com/webhook",
    "name": "Order Status Updates",
    "events": ["sms.delivered", "sms.failed"],
    "isActive": true,
    "secret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. GET `/api/webhooks`

Get user's webhooks.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Results per page |
| `offset` | number | 0 | Pagination offset |
| `isActive` | boolean | null | Filter by active status |

#### Response

```json
{
  "success": true,
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 1,
    "hasMore": false
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Order Status Updates",
      "url": "https://your-domain.com/webhook",
      "events": ["sms.delivered", "sms.failed"],
      "isActive": true,
      "stats": {
        "totalCalls": 150,
        "successfulCalls": 145,
        "failedCalls": 5,
        "averageResponseTime": 234
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. GET `/api/webhooks/:webhookId`

Get specific webhook with full details.

#### Response

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Order Status Updates",
    "url": "https://your-domain.com/webhook",
    "description": "Receive SMS delivery notifications",
    "events": ["sms.delivered", "sms.failed"],
    "isActive": true,
    "secret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "retryEnabled": true,
    "retryCount": 3,
    "retryBackoffMs": 5000,
    "notifyOnFailure": true,
    "maxPayloadSize": 1048576,
    "stats": {
      "totalCalls": 150,
      "successfulCalls": 145,
      "failedCalls": 5,
      "lastCall": "2024-01-15T11:00:00Z",
      "lastCallStatus": 200,
      "averageResponseTime": 234
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

---

### 4. PUT `/api/webhooks/:webhookId`

Update webhook configuration.

#### Request Body

```json
{
  "url": "https://new-domain.com/webhook",
  "events": ["sms.sent", "sms.delivered", "sms.failed"],
  "isActive": true,
  "retryCount": 5
}
```

#### Response

```json
{
  "success": true,
  "msg": "Webhook updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Order Status Updates",
    "url": "https://new-domain.com/webhook",
    "events": ["sms.sent", "sms.delivered", "sms.failed"],
    "isActive": true,
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

---

### 5. DELETE `/api/webhooks/:webhookId`

Delete webhook.

#### Response

```json
{
  "success": true,
  "msg": "Webhook deleted successfully"
}
```

---

### 6. POST `/api/webhooks/:webhookId/rotate-secret`

Rotate webhook secret (invalidates old secret).

#### Response

```json
{
  "success": true,
  "msg": "Webhook secret rotated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "secret": "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

---

### 7. POST `/api/webhooks/:webhookId/test`

Send test webhook payload.

#### Response

```json
{
  "success": true,
  "msg": "Test webhook sent successfully",
  "data": {
    "httpStatusCode": 200,
    "responseTime": 145,
    "error": null
  }
}
```

---

### 8. GET `/api/webhooks/:webhookId/events`

Get webhook events/logs.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset (default: 0) |
| `status` | string | Filter by status (pending, sent, failed, success) |
| `eventType` | string | Filter by event type |
| `startDate` | string | Filter from date (ISO format) |
| `endDate` | string | Filter until date (ISO format) |

#### Response

```json
{
  "success": true,
  "pagination": {
    "total": 342,
    "limit": 50,
    "offset": 0,
    "page": 1,
    "totalPages": 7,
    "hasMore": true
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "eventType": "sms.delivered",
      "status": "success",
      "attempts": 1,
      "maxAttempts": 3,
      "httpStatusCode": 200,
      "requestDurationMs": 234,
      "lastAttemptError": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "sentAt": "2024-01-15T10:30:00Z",
      "nextRetryTime": null
    }
  ]
}
```

---

### 9. GET `/api/webhooks/:webhookId/stats`

Get webhook statistics.

#### Response

```json
{
  "success": true,
  "data": {
    "webhook": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Order Status Updates",
      "url": "https://your-domain.com/webhook",
      "isActive": true,
      "stats": {
        "totalCalls": 342,
        "successfulCalls": 328,
        "failedCalls": 14,
        "lastCall": "2024-01-15T11:00:00Z",
        "lastCallStatus": 200,
        "averageResponseTime": 234
      }
    },
    "eventStats": {
      "overview": [
        {
          "totalEvents": 342,
          "successCount": 328,
          "failedCount": 14,
          "pendingCount": 0
        }
      ],
      "byEventType": [
        {
          "_id": "sms.delivered",
          "count": 250
        },
        {
          "_id": "sms.failed",
          "count": 92
        }
      ],
      "recentEvents": [
        {
          "_id": "507f1f77bcf86cd799439020",
          "eventType": "sms.delivered",
          "status": "success",
          "createdAt": "2024-01-15T11:00:00Z"
        }
      ]
    }
  }
}
```

---

## Webhook Payload Format

When an event triggers, the webhook receives a POST request with this format:

```json
{
  "logId": "507f1f77bcf86cd799439011",
  "provider": "nexmo",
  "recipient": "+1234567890",
  "status": "delivered",
  "messageId": "provider-msg-id-xyz",
  "cost": 0.067,
  "currency": "USD",
  "sentAt": "2024-01-15T10:30:00Z",
  "deliveredAt": "2024-01-15T10:30:15Z",
  "errorReason": null,
  "errorCode": null
}
```

### Headers

```
POST /webhook HTTP/1.1
Host: your-domain.com
X-Webhook-Signature: 09123f9d1e2c3a4b5c6d7e8f9a0b1c2d
X-Webhook-Event: sms.delivered
X-Webhook-Delivery: 507f1f77bcf86cd799439020
Content-Type: application/json
Content-Length: 245
```

---

## Signature Verification

To verify webhook authenticity, validate the `X-Webhook-Signature` header:

### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(hash)
    );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const secret = 'your-webhook-secret';
    
    if (!verifyWebhookSignature(req.body, signature, secret)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process webhook
    console.log('Webhook verified:', req.body);
    res.json({ success: true });
});
```

### Python Example

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload, signature, secret):
    if isinstance(payload, dict):
        payload = json.dumps(payload)
    
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

# In your webhook handler:
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    secret = 'your-webhook-secret'
    
    if not verify_webhook_signature(request.json, signature, secret):
        return {'error': 'Invalid signature'}, 401
    
    # Process webhook
    print('Webhook verified:', request.json)
    return {'success': True}
```

---

## Retry Logic

Failed webhook deliveries are automatically retried with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: backoffMs * 2^0 = 5 seconds
Attempt 3: backoffMs * 2^1 = 10 seconds
Attempt 4: backoffMs * 2^2 = 20 seconds
...
Max: 3 attempts (configurable)
```

**Failed Retry Job**: Runs every 60 seconds to process pending events.

---

## Use Cases

### 1. **Real-time Notifications to Users**
```javascript
// Send notification to user when SMS is delivered
POST /webhook → Update user dashboard, send in-app notification
```

### 2. **Third-party Integrations**
```javascript
// Integrate with CRM, support tickets, marketing platforms
POST /webhook → Salesforce, HubSpot, Intercom, etc.
```

### 3. **Audit Logging**
```javascript
// Log all SMS events for compliance
POST /webhook → Store in audit database
```

### 4. **Monitoring & Alerts**
```javascript
// Alert on delivery failures
POST /webhook → If status=failed, send Slack alert
```

### 5. **Analytics & Reporting**
```javascript
// Track SMS metrics for reporting
POST /webhook → Aggregate stats, update dashboards
```

---

## Security Best Practices

1. **Always verify signatures** using the secret
2. **Use HTTPS only** for webhook URLs
3. **Rotate secrets regularly** for compromised webhooks
4. **Rate limit your endpoints** to prevent abuse
5. **Validate payload structure** before processing
6. **Log all webhook events** for auditing
7. **Set reasonable timeouts** (10 seconds)
8. **Handle retries gracefully** to avoid duplicate processing

---

## Testing Webhooks

### Using curl

```bash
# Create webhook
curl -X POST http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/unique-id",
    "name": "Test Webhook",
    "events": ["sms.delivered", "sms.failed"]
  }'

# Send test payload
curl -X POST http://localhost:5000/api/webhooks/:webhookId/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get webhook events
curl -X GET http://localhost:5000/api/webhooks/:webhookId/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using webhook.site

1. Go to https://webhook.site
2. Copy your unique URL
3. Create webhook with that URL
4. View all deliveries in real-time on webhook.site

---

## Performance Considerations

### Response Time Overhead
- **Webhook trigger**: < 1ms (async, non-blocking)
- **Webhook delivery**: 200-500ms (depends on user endpoint)
- **Retry processing**: Runs every 60 seconds

### Storage
- Average event size: 1-2KB
- 1000 events/day ≈ 1-2MB/day
- Auto-cleanup after 90 days via TTL index

---

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Missing URL | 400 | 'URL and name are required' |
| Invalid URL | 400 | 'Webhook URL must start with http:// or https://' |
| Webhook not found | 404 | 'Webhook not found with ID: ...' |
| Unauthorized | 403 | 'Unauthorized: Cannot access this webhook' |
| Server error | 500 | Error message |

---

## Future Enhancements

1. **Webhook Event Filtering**: Filter events by recipient, cost range, provider
2. **Batch Events**: Send multiple events in single request
3. **Event Transformation**: Transform payload before sending
4. **Conditional Webhooks**: Trigger based on message content or recipient
5. **Webhook Templates**: Pre-built integrations (Slack, Discord, Teams)
6. **Circuit Breaker**: Auto-disable failing webhooks
7. **Webhook Signature Verification UI**: Visual verification tool

---

## Related Documentation

- [Rate Limiting](./RATE_LIMITING.md)
- [SMS Delivery Tracking](./SMS_DELIVERY_TRACKING.md)
- [SMS History & Filtering](./SMS_HISTORY_FILTERING.md)
- [Request Logging](./REQUEST_LOGGING.md)
- [User Profile Update](./USER_PROFILE_UPDATE.md)
- [API Documentation](./README.md)

