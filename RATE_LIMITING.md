# Rate Limiting Feature Documentation

## Overview

Rate limiting has been implemented to prevent API abuse, brute force attacks, and ensure fair resource allocation across all users.

## Implementation Details

### Middleware Location
- **File:** `middleware/rateLimit.js`
- **Applied in:** `app.js`

### Rate Limiting Tiers

#### 1. General API Limiter (Lowest Priority)
- **Limit:** 100 requests per 15 minutes per IP
- **Applied to:** All API routes
- **Purpose:** Basic DoS protection

#### 2. Authentication Limiter (Highest Priority)
- **Limit:** 5 requests per 15 minutes per IP
- **Applied to:** `/api/users/register`, `/api/users/login`
- **Purpose:** Prevent brute force attacks on authentication endpoints

#### 3. SMS Limiter (High Priority)
- **Limit:** 10 requests per 15 minutes per IP/user
- **Applied to:** `/api/sms/send`
- **Purpose:** Prevent SMS spam
- **Special:** Uses authenticated username if available, falls back to IP

#### 4. Profile Update Limiter (Medium Priority)
- **Limit:** 5 profile updates per 15 minutes per user
- **Applied to:** `/api/users/profile` (when implemented)
- **Purpose:** Prevent profile manipulation abuse

## Error Responses

When rate limit is exceeded, API returns:

```json
{
  "success": false,
  "msg": "Too many requests. Please try again later.",
  "retryAfter": "2025-10-26T10:45:00Z"
}
```

**HTTP Status:** 429 (Too Many Requests)

## Configuration

### Adjusting Limits

Edit `middleware/rateLimit.js` to modify limits:

```javascript
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // Change time window (in milliseconds)
    max: 5,                     // Change max requests
    // ... other config
});
```

### Time Windows (Common Values)
- 1 minute: `1 * 60 * 1000`
- 5 minutes: `5 * 60 * 1000`
- 15 minutes: `15 * 60 * 1000`
- 1 hour: `60 * 60 * 1000`

## Usage Examples

### For Developers

#### Test Rate Limiting (Register endpoint)
```bash
# First 5 requests will succeed
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'

# 6th request within 15 minutes will be rate limited
# Response: 429 status with rate limit message
```

#### Test SMS Rate Limiting
```bash
# First 10 requests will succeed (within 15 minutes)
curl -X POST http://localhost:5000/api/sms/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Username: your_username" \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","from":"TEST","text":"Hello"}'

# 11th request will be rate limited
```

## Headers

### Rate Limit Information Headers

All responses include rate limit information:

```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1635274500
```

- **RateLimit-Limit:** Total requests allowed in window
- **RateLimit-Remaining:** Requests remaining in current window
- **RateLimit-Reset:** Unix timestamp when limit resets

## Security Considerations

### IP-Based vs User-Based Limiting

- **SMS Endpoint:** Uses authenticated username if available (more accurate)
- **Auth Endpoints:** Uses IP address (protects against distributed attacks)

### Distributed Attacks

For behind-a-proxy or load-balanced deployments, configure Express to trust proxy:

```javascript
app.set('trust proxy', 1); // Add to app.js if needed
```

## Deployment Recommendations

### Production Settings

For production, consider:

1. **Increase limits** if you have high-volume legitimate traffic:
   ```javascript
   max: 200 // for general limiter
   max: 10  // for auth limiter
   ```

2. **Decrease limits** for enhanced security:
   ```javascript
   max: 30  // for general limiter
   max: 3   // for auth limiter
   ```

3. **Use Redis for distributed rate limiting** (optional):
   - Allows rate limiting across multiple server instances
   - See `express-rate-limit` documentation for Redis adapter

## Monitoring

### Log Rate Limit Hits

To track rate limit violations, add logging:

```javascript
const limiter = rateLimit({
    // ... config
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
        // ... custom response
    }
});
```

## Troubleshooting

### Legitimate Users Being Rate Limited

- **Issue:** High-frequency legitimate requests (e.g., automated tools)
- **Solution:** 
  - Whitelist specific IPs or users
  - Increase `max` value
  - Increase `windowMs` value

### Rate Limit Not Working

- **Issue:** Behind proxy/load balancer
- **Solution:** Add `app.set('trust proxy', 1)` to `app.js`

## Future Enhancements

- [ ] Redis support for distributed rate limiting
- [ ] Per-user custom rate limits (premium users get higher limits)
- [ ] Dynamic rate limiting based on API load
- [ ] Rate limit analytics and dashboard
- [ ] IP whitelist management

## References

- [express-rate-limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [HTTP 429 Status Code](https://http.cat/429)
- [OWASP Rate Limiting](https://owasp.org/www-community/attacks/Rate_limiting)

---

**Implementation Date:** October 26, 2025  
**Package Version:** express-rate-limit ^6.7.0
