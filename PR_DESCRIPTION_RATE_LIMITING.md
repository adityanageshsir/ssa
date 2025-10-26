# Pull Request: Add Rate Limiting Middleware

## Summary

This PR introduces rate limiting to the Spoof SMS API to prevent abuse, brute force attacks, and ensure fair resource allocation.

## Changes Made

### 1. **New Middleware: `middleware/rateLimit.js`**
   - Implements express-rate-limit with multiple tiers:
     - **General Limiter:** 100 requests per 15 minutes (all routes)
     - **Auth Limiter:** 5 requests per 15 minutes (login/register protection)
     - **SMS Limiter:** 10 requests per 15 minutes (spam prevention)
     - **Profile Update Limiter:** 5 updates per 15 minutes (abuse prevention)
   - Custom error handler returns JSON 429 responses
   - Support for IP-based and user-based rate limiting

### 2. **Updated `app.js`**
   - Added import for rate limiting middleware
   - Applied general limiter to all routes
   - Applied auth limiter to `/api/users` routes
   - Applied SMS limiter to `/api/sms` routes

### 3. **Updated `package.json`**
   - Added dependency: `express-rate-limit: ^6.7.0`

### 4. **New Documentation: `RATE_LIMITING.md`**
   - Comprehensive guide on rate limiting implementation
   - Configuration options and adjustment instructions
   - Security considerations and best practices
   - Deployment recommendations
   - Troubleshooting guide

## Features

✅ **Multi-tier Rate Limiting**
- Different limits for different endpoint types
- Protects against brute force and spam attacks

✅ **Smart User Identification**
- Uses authenticated username when available
- Falls back to IP address for unauthenticated requests

✅ **JSON Error Responses**
- Returns proper 429 (Too Many Requests) status code
- Includes `retryAfter` timestamp in response

✅ **Rate Limit Headers**
- Includes standard rate limit headers in responses
- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

## Testing

### Test Rate Limiting on Register Endpoint
```bash
# Make 5 requests (will succeed)
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","email":"test1@example.com","password":"pass123"}'

# Make 6th request (will be rate limited)
# Response: 429 status with message
```

### Test Rate Limiting on SMS Endpoint
```bash
# Make 10 SMS requests (will succeed)
curl -X POST http://localhost:5000/api/sms/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Username: your_username" \
  -d '{"to":"+1234567890","from":"TEST","text":"Hello"}'

# Make 11th request (will be rate limited)
```

## Configuration

### Adjust Rate Limits
Edit `middleware/rateLimit.js` to modify limits:

```javascript
// Change auth limiter to 10 attempts per 15 minutes
const authLimiter = rateLimit({
    max: 10, // Changed from 5
    windowMs: 15 * 60 * 1000,
    // ... rest of config
});
```

### Time Windows
- 1 minute: `1 * 60 * 1000`
- 5 minutes: `5 * 60 * 1000`
- 15 minutes: `15 * 60 * 1000` (default)
- 1 hour: `60 * 60 * 1000`

## Error Response Example

```json
{
  "success": false,
  "msg": "Too many requests. Please try again later.",
  "retryAfter": "2025-10-26T10:45:00Z"
}
```

## Security Benefits

1. **Brute Force Protection:** 5 attempts per 15 minutes on login/register
2. **SMS Spam Prevention:** 10 SMS per 15 minutes per user
3. **DoS Mitigation:** 100 requests per 15 minutes general limit
4. **Fair Resource Allocation:** Prevents single user/IP monopolizing service

## Performance Impact

- ✅ Minimal overhead (middleware-level processing)
- ✅ In-memory storage (default) - no database calls
- ✅ Scales with app instances (with Redis option available)

## Deployment Notes

### For Production
1. Review rate limits based on your expected traffic
2. Consider using Redis for distributed rate limiting across multiple instances
3. Whitelist trusted IPs if needed (e.g., monitoring services)
4. Monitor rate limit violations through logs

### Behind Proxy/Load Balancer
If deployed behind a proxy, add to `app.js`:
```javascript
app.set('trust proxy', 1);
```

## Dependencies Added

```json
"express-rate-limit": "^6.7.0"
```

**Why this package?**
- Industry-standard rate limiting for Express.js
- Simple, configurable, and performant
- Good documentation and active maintenance
- Supports custom key generators and handlers

## Future Enhancements

- [ ] Redis support for distributed rate limiting
- [ ] Per-user premium tier with higher limits
- [ ] Dynamic rate limiting based on load
- [ ] Rate limit analytics dashboard
- [ ] Whitelist/blacklist management

## Breaking Changes

❌ **None** - This is backwards compatible. All rate limits have reasonable defaults.

## Checklist

- [x] Code follows project style guidelines
- [x] Comments added for complex logic
- [x] Documentation created (RATE_LIMITING.md)
- [x] Package.json updated with new dependency
- [x] Tested locally
- [x] No breaking changes
- [x] Error handling implemented
- [x] Security considerations addressed

## Related Issues

Resolves: Rate limiting requested for production readiness

## Screenshots/Examples

### Rate Limit Response (429)
```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1635274500

{
  "success": false,
  "msg": "Too many requests. Please try again later.",
  "retryAfter": "2025-10-26T10:45:00Z"
}
```

## Reviewer Notes

Please review:
1. Rate limit values - are they appropriate for your use case?
2. Middleware placement - do we need to adjust which routes get which limiters?
3. Error messages - are they user-friendly?
4. Documentation - is it clear enough?

---

**Feature Branch:** `feature/add-rate-limiting`  
**Commit:** `ab7eb4f`  
**Created:** October 26, 2025
