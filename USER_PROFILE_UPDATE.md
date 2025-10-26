# User Profile Update Endpoint Documentation

## Overview

The User Profile Update feature allows users to manage their account information including name, email, password changes, and account deletion with full security and validation.

## Features

### ✅ Profile Management

- Update name and email
- Change password with current password verification
- View own profile information
- Delete account with password confirmation
- Password strength validation

### ✅ New Endpoints

1. **PUT `/api/users/profile`** - Update name/email
2. **PUT `/api/users/change-password`** - Change password
3. **GET `/api/users/profile`** - Get profile information
4. **GET `/api/users/password-strength/:password`** - Check password strength
5. **DELETE `/api/users/account`** - Delete account

### ✅ New Service: UserProfileService

Located in `services/userProfile.js` with methods:

- `updateProfile()` - Update name and email
- `changePassword()` - Change user password
- `getProfile()` - Get user profile
- `deleteAccount()` - Delete user account
- `validatePasswordStrength()` - Validate password strength
- `_sanitizeUser()` - Remove sensitive data

## Usage Examples

### Update Profile (Name and Email)

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "msg": "Profile updated successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "date": "2025-10-26T10:00:00Z"
  }
}
```

### Change Password

```bash
curl -X PUT http://localhost:5000/api/users/change-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword456!",
    "confirmPassword": "NewPassword456!"
  }'
```

**Response:**
```json
{
  "success": true,
  "msg": "Password changed successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe"
  }
}
```

### Get User Profile

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "date": "2025-10-26T10:00:00Z"
  }
}
```

### Check Password Strength

```bash
curl -X GET http://localhost:5000/api/users/password-strength/MyPass123! \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "score": 100,
    "strength": "strong",
    "issues": []
  }
}
```

**Weak Password Example:**
```bash
curl -X GET http://localhost:5000/api/users/password-strength/weak
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "isValid": false,
    "score": 20,
    "strength": "weak",
    "issues": [
      "Include uppercase letters",
      "Include numbers",
      "Include special characters"
    ]
  }
}
```

### Delete Account

```bash
curl -X DELETE http://localhost:5000/api/users/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "CurrentPassword123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "msg": "Account deleted successfully"
}
```

## Validation Rules

### Name
- Minimum: 2 characters
- Maximum: 100 characters
- Trimmed of whitespace

### Email
- Valid email format (RFC 5322)
- Must be unique across users
- Case-insensitive

### Password Requirements

| Requirement | Rule |
|------------|------|
| Length | 6-50 characters |
| Current Password | Must be correct to change |
| New Password | Must differ from current |
| Match Confirmation | Must match confirm field |

### Password Strength Scoring

| Factor | Points | Requirement |
|--------|--------|-------------|
| Length >= 6 | 20 | Minimum length |
| Length >= 12 | 20 | Extended length |
| Lowercase | 15 | a-z characters |
| Uppercase | 15 | A-Z characters |
| Numbers | 15 | 0-9 characters |
| Special chars | 15 | !@#$%^&* etc |

**Strength Levels:**
- Strong: >= 70 points
- Medium: 40-69 points
- Weak: < 40 points

## Security Features

### ✅ Authentication
- JWT required for profile operations
- Password verification for sensitive actions
- Current password must match for password change

### ✅ Data Privacy
- Password never returned in responses
- User can only modify own profile
- Email uniqueness enforced across all users

### ✅ Validation
- Input sanitization
- Email format validation
- Password strength requirements
- Field length limits

### ✅ Error Handling
- Safe error messages
- No credential exposure
- Validation feedback without leaking data

## Error Responses

### Validation Errors

```json
{
  "success": false,
  "msg": "Email is already in use"
}
```

### Authentication Errors

```json
{
  "success": false,
  "msg": "Current password is incorrect"
}
```

### Authorization Errors

```json
{
  "success": false,
  "msg": "Unauthorized"
}
```

## Rate Limiting

Profile update endpoints are protected by the auth rate limiter:
- **Limit:** 5 requests per 15 minutes
- **Applies to:** PUT and DELETE operations
- **Protection:** Prevents brute force and abuse

## Best Practices

### For Users

1. **Before Password Change**
   - Ensure new password meets strength requirements
   - Use complex passwords (mix of upper, lower, numbers, symbols)
   - Never share password with anyone

2. **Email Updates**
   - Verify new email is correct
   - Update email address if compromised
   - Keep backup email updated

3. **Account Deletion**
   - Download any data before deletion
   - This action is irreversible
   - All SMS history will be removed

### For Developers

1. **Client Implementation**
   ```javascript
   // Check password strength before submission
   const response = await fetch('/api/users/password-strength/password123');
   const { validation } = await response.json();
   
   if (!validation.isValid) {
       showErrors(validation.issues);
   }
   ```

2. **Error Handling**
   ```javascript
   try {
       const response = await fetch('/api/users/profile', {
           method: 'PUT',
           headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({ name, email })
       });
       
       if (!response.ok) {
           const error = await response.json();
           showError(error.msg);
       }
   } catch (error) {
       showError('Network error');
   }
   ```

3. **Request Validation**
   - Always validate input on client side
   - Handle rate limit responses (429)
   - Implement exponential backoff for retries

## API Reference

### Update Profile

```
PUT /api/users/profile
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "name": "string (optional)",
  "email": "string (optional)"
}

Response (200):
{
  "success": true,
  "msg": "Profile updated successfully",
  "user": { ... }
}
```

### Change Password

```
PUT /api/users/change-password
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "currentPassword": "string (required)",
  "newPassword": "string (required)",
  "confirmPassword": "string (required)"
}

Response (200):
{
  "success": true,
  "msg": "Password changed successfully",
  "user": { ... }
}
```

### Get Profile

```
GET /api/users/profile
Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "user": { ... }
}
```

### Check Password Strength

```
GET /api/users/password-strength/{password}

Response (200):
{
  "success": true,
  "validation": {
    "isValid": boolean,
    "score": number,
    "strength": "weak|medium|strong",
    "issues": string[]
  }
}
```

### Delete Account

```
DELETE /api/users/account
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "password": "string (required)"
}

Response (200):
{
  "success": true,
  "msg": "Account deleted successfully"
}
```

## Integration with Rate Limiting

The profile update endpoints are protected by the auth rate limiter:

```javascript
// app.js already configured:
app.use('/api/users', authLimiter, users)

// Limits:
// - 5 requests per 15 minutes per IP/user
// - Returns 429 with retry information
```

## Future Enhancements

- [ ] Email verification for email changes
- [ ] Two-factor authentication
- [ ] Password reset via email
- [ ] Login activity history
- [ ] Session management (logout all devices)
- [ ] Profile picture upload
- [ ] Phone number verification
- [ ] OAuth integration

## Troubleshooting

### "Email is already in use"
- Choose a different email address
- Email is case-insensitive

### "Current password is incorrect"
- Ensure you typed the correct current password
- Passwords are case-sensitive

### "Name must be at least 2 characters"
- Enter a valid name with at least 2 characters
- Remove extra whitespace

### "Password does not meet requirements"
- Add uppercase and lowercase letters
- Include at least one number
- Add special characters (!@#$%^&*)

---

**Implementation Date:** October 26, 2025  
**Feature Version:** 1.0.0  
**API Endpoints:** 5 new endpoints
