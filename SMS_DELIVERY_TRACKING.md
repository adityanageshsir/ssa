# SMS Delivery Status Tracking Documentation

## Overview

The SMS Delivery Status Tracking feature provides comprehensive tracking of SMS messages from send to delivery, including status updates, error handling, and delivery analytics.

## Features

### ✅ Delivery Status States

```
pending  → Message sent to provider, awaiting confirmation
sent     → Provider acknowledged receipt
delivered → SMS successfully delivered to recipient
failed   → Delivery failed (permanent error)
bounced  → Invalid number or network issue
```

### ✅ New Endpoints

1. **POST `/api/sms/send`** - Enhanced with delivery tracking
2. **GET `/api/sms/status/:logId`** - Get individual SMS status
3. **GET `/api/sms/history`** - View SMS history with filters
4. **GET `/api/sms/stats`** - Get delivery statistics
5. **PUT `/api/sms/status/:logId`** - Update delivery status (webhook support)

### ✅ New Model Fields

The `Log` model has been enhanced with:

| Field | Type | Purpose |
|-------|------|---------|
| `delivery_status` | String | Current delivery status |
| `provider_used` | String | Which provider sent SMS |
| `provider_message_id` | String | Provider's unique message ID |
| `error_reason` | String | Error description if failed |
| `error_code` | String | Provider error code |
| `sent_at` | Date | When SMS was sent |
| `delivered_at` | Date | When SMS was delivered |
| `cost` | Number | SMS cost from provider |
| `currency` | String | Currency (default: USD) |
| `message_length` | Number | Message length |
| `number_of_parts` | Number | Parts if multi-part SMS |

### ✅ New Service: DeliveryStatusService

Located in `services/deliveryStatus.js` with methods:

- `createLog()` - Create new SMS log
- `updateDeliveryStatus()` - Update SMS status
- `getDeliveryStatus()` - Get SMS by log ID
- `getDeliveryStatusByProviderId()` - Get SMS by provider ID
- `getUserDeliveryHistory()` - Get user's SMS history with filters
- `getDeliveryStats()` - Get delivery analytics
- `bulkUpdateDeliveryStatus()` - Batch update (for webhooks)

## Usage Examples

### Send SMS (with delivery tracking)

```bash
curl -X POST http://localhost:5000/api/sms/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Username: your_username" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "from": "TEST",
    "text": "Hello World"
  }'
```

**Response:**
```json
{
  "success": true,
  "msg": "SMS sent successfully",
  "logId": "507f1f77bcf86cd799439011",
  "deliveryStatus": "pending",
  "providerResponse": { ... }
}
```

### Check SMS Status

```bash
curl -X GET http://localhost:5000/api/sms/status/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "victim": "+1234567890",
    "message": "Hello World",
    "delivery_status": "delivered",
    "provider_used": "nexmo",
    "sent_at": "2025-10-26T10:30:00Z",
    "delivered_at": "2025-10-26T10:30:05Z",
    "created_at": "2025-10-26T10:30:00Z",
    "cost": 0.05
  }
}
```

### Get SMS History

```bash
curl -X GET "http://localhost:5000/api/sms/history?limit=20&offset=0&status=delivered" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "total": 45,
  "limit": 20,
  "offset": 0,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "victim": "+1234567890",
      "message": "Hello...",
      "delivery_status": "delivered",
      "provider_used": "nexmo",
      "created_at": "2025-10-26T10:30:00Z",
      "sent_at": "2025-10-26T10:30:00Z",
      "delivered_at": "2025-10-26T10:30:05Z"
    }
  ]
}
```

### Get Delivery Statistics

```bash
curl -X GET http://localhost:5000/api/sms/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_sent": 150,
    "total_delivered": 148,
    "total_failed": 1,
    "total_pending": 1,
    "total_bounced": 0,
    "delivery_rate": "98.67%",
    "failure_rate": "0.67%"
  }
}
```

### Update SMS Status (via Webhook)

```bash
curl -X PUT http://localhost:5000/api/sms/status/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "error_reason": null,
    "error_code": null
  }'
```

## Query Parameters

### History Endpoint Filters

```
/api/sms/history?limit=20&offset=0&status=sent&provider=nexmo
```

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `limit` | Number | 20 | 1-100 |
| `offset` | Number | 0 | >= 0 |
| `status` | String | null | pending, sent, delivered, failed, bounced |
| `provider` | String | null | nexmo, mailgun, twilio |

## Security

### Authorization
- All endpoints require JWT authentication
- Users can only see their own SMS logs and stats
- Status updates check user ownership

### Data Privacy
- User can't access other users' SMS history
- Error messages don't leak sensitive data
- Provider credentials never exposed in responses

## Database Indexes

Optimized indexes for performance:

```javascript
- { username: 1, created_at: -1 }
- { victim: 1, created_at: -1 }
- { delivery_status: 1, created_at: -1 }
- { provider_message_id: 1 }
```

## Webhook Integration

To integrate with provider webhooks (Nexmo, Mailgun, Twilio):

### 1. Create Webhook Endpoint
```javascript
// Example webhook handler
router.post('/webhook/delivery', async (req, res) => {
    const { logId, status, error_reason } = req.body;
    
    await DeliveryStatusService.updateDeliveryStatus(
        logId,
        status,
        { error_reason }
    );
    
    res.json({ success: true });
});
```

### 2. Bulk Update (Multiple Messages)
```javascript
const updates = [
    { logId: 'id1', status: 'delivered' },
    { logId: 'id2', status: 'failed', options: { error_reason: 'Invalid' } }
];

const results = await DeliveryStatusService.bulkUpdateDeliveryStatus(updates);
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid status | Wrong status value | Use: pending, sent, delivered, failed, bounced |
| Log not found | Non-existent log ID | Check log ID format |
| Unauthorized | Accessing other user's SMS | Only access own SMS |
| Invalid body | Missing required fields | Include all required fields |

## Future Enhancements

- [ ] Webhook secret verification (HMAC)
- [ ] Delivery status callbacks
- [ ] SMS retry logic
- [ ] Cost analytics and billing
- [ ] Export delivery reports (CSV/PDF)
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering and search

## Performance Considerations

1. **Indexes:** Queries use database indexes for fast lookups
2. **Pagination:** Large history uses limit/offset for efficiency
3. **Aggregation:** Stats use MongoDB aggregation pipeline
4. **Caching:** Consider caching stats for frequently accessed users

## Migration Notes

For existing projects upgrading to this version:

```bash
# Update Log schema
# Existing data will work but without new fields
# New SMS will use full tracking capabilities

# No breaking changes to existing endpoints
# All changes are additive
```

## Monitoring

Monitor delivery metrics:

```javascript
const stats = await DeliveryStatusService.getDeliveryStats(username);

// Alert if delivery rate drops below 95%
if (stats.delivery_rate < 95) {
    console.warn('Low delivery rate detected');
}

// Alert if too many failures
if (stats.total_failed > 10) {
    console.warn('High failure rate detected');
}
```

## References

- [Nexmo Delivery Receipts](https://developer.vonage.com/en/messaging/sms/guides/delivery-receipts)
- [Mailgun Webhooks](https://documentation.mailgun.com/en/latest/user_manual.html#webhooks)
- [Twilio Webhooks](https://www.twilio.com/docs/sms/webhooks)

---

**Implementation Date:** October 26, 2025  
**Feature Version:** 1.0.0
