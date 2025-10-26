# Security Policy

## Reporting Security Vulnerabilities

We take the security of the Spoof SMS API seriously. If you've found a security vulnerability, please **do not** create a public GitHub issue.

### How to Report

1. **Email the maintainers** (if contact available in repository)
2. **Include details**:
   - Description of the vulnerability
   - Affected versions
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

3. **What to expect**:
   - Acknowledgment within 48 hours
   - Regular updates on the fix progress
   - Credit in the security advisory (optional)
   - Responsible disclosure period before public announcement

## Security Best Practices

### For Users

When using this project:

1. **Keep dependencies updated**: Run `npm update` regularly
2. **Use environment variables**: Store sensitive data in `.env` files (not in code)
3. **Secure API keys**: Protect Nexmo, Mailgun, and MongoDB credentials
4. **Use HTTPS**: Always use HTTPS in production
5. **Validate input**: Always validate and sanitize user input
6. **Limit access**: Restrict API access to authorized users only
7. **Monitor logs**: Regularly review application logs for suspicious activity

### Configuration Security

```javascript
// ✅ Good: Use environment variables
const config = {
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  apiKeys: {
    nexmo: process.env.NEXMO_API_KEY,
    mailgun: process.env.MAILGUN_API_KEY
  }
};

// ❌ Bad: Hardcoded credentials
const config = {
  mongoURI: 'mongodb://user:password@host',
  jwtSecret: 'my-secret-key'
};
```

### Authentication Security

- Use strong JWT secrets (minimum 32 characters)
- Implement token expiration
- Use bcryptjs for password hashing (already configured)
- Don't send passwords in logs
- Implement rate limiting on login attempts

### API Security

- Validate all input with Joi (already implemented)
- Use CORS appropriately
- Implement rate limiting
- Add request timeout limits
- Validate API responses from third-party services

## Dependency Management

### Keeping Dependencies Secure

1. **Audit regularly**:
   ```bash
   npm audit
   npm audit fix
   ```

2. **Update frequently**:
   ```bash
   npm outdated
   npm update
   ```

3. **Check for vulnerabilities**:
   ```bash
   npm audit --audit-level=moderate
   ```

### Known Issues

Check [Security Advisories](https://github.com/adityanageshsir/ssa/security/advisories) for any reported vulnerabilities.

## Production Deployment

### Before Going Live

- [ ] Set all environment variables in production environment
- [ ] Use strong JWT secret (not the default)
- [ ] Enable HTTPS/TLS
- [ ] Set secure cookies in production
- [ ] Implement rate limiting
- [ ] Set up logging and monitoring
- [ ] Use a WAF (Web Application Firewall)
- [ ] Regular security audits
- [ ] Keep Node.js and dependencies updated

### Environment Variables

```bash
# .env (never commit this file)
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=your-very-long-random-secret
NODE_ENV=production
PORT=5000
NEXMO_API_KEY=your-nexmo-key
NEXMO_API_SECRET=your-nexmo-secret
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-mailgun-domain
```

## Vulnerability Scoring

We use CVSS (Common Vulnerability Scoring System) to assess severity:

- **Critical (9.0-10.0)**: Immediate action required
- **High (7.0-8.9)**: Urgent attention needed
- **Medium (4.0-6.9)**: Should be addressed soon
- **Low (0.1-3.9)**: Can be addressed in regular updates

## Security Updates

- **Monthly**: Dependency updates
- **As needed**: Security patches (may be released outside regular cycle)
- **Annually**: Security audit

## Compliance

This project follows:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

## Third-Party Security

### SMS Service Providers

This project integrates with:
- **Nexmo/Vonage**: [Security Documentation](https://developer.vonage.com/en/security)
- **Mailgun**: [Security Features](https://www.mailgun.com/security/)

Ensure you review their security policies and credentials management.

### Dependencies Security

Key dependencies and their security considerations:
- **Express.js**: Web framework with built-in security headers
- **Mongoose**: ODM with schema validation
- **Passport.js**: Authentication middleware with proven security
- **bcryptjs**: Industry-standard password hashing
- **jsonwebtoken**: JWT implementation with verification
- **Joi**: Input validation framework

## Security Checklist for Contributors

When contributing code:

- [ ] No hardcoded credentials or secrets
- [ ] Input validation on all user-facing functions
- [ ] Output encoding for preventing XSS
- [ ] SQL/NoSQL injection prevention
- [ ] Error messages don't leak sensitive info
- [ ] Authentication/authorization checks
- [ ] Logging doesn't include sensitive data
- [ ] HTTPS used for external API calls
- [ ] Dependencies are up to date
- [ ] Code review completed

## Further Reading

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Security Working Group](https://nodejs.org/en/about/security/)
- [npm Security Best Practices](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

**Thank you for helping us maintain a secure project!**
