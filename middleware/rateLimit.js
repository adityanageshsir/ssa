/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per IP/user
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for health checks or specific routes
        return req.path === '/health';
    }
});

/**
 * Strict limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Prevents brute force attacks on login/register
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count successful requests too
    skipFailedRequests: false // Count failed requests
});

/**
 * Moderate limiter for SMS sending
 * Limits: 10 requests per 15 minutes per IP
 * Prevents SMS spam/abuse
 */
const smsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 SMS requests per windowMs
    message: 'Too many SMS requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    // Custom key generator to rate limit per user if authenticated
    keyGenerator: (req) => {
        // If user is authenticated, use username for rate limiting
        if (req.user && req.user.username) {
            return `${req.user.username}-sms`;
        }
        // Otherwise use IP address
        return req.ip;
    }
});

/**
 * Profile update limiter
 * Limits: 5 requests per 15 minutes per user
 */
const profileUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit to 5 profile updates per windowMs
    message: 'Too many profile update attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by user if authenticated, else by IP
        if (req.user && req.user.username) {
            return `${req.user.username}-profile`;
        }
        return req.ip;
    }
});

/**
 * Custom error handler for rate limit
 * Returns JSON response instead of HTML
 */
const rateLimitErrorHandler = (req, res) => {
    res.status(429).json({
        success: false,
        msg: 'Too many requests. Please try again later.',
        retryAfter: req.rateLimit.resetTime
    });
};

// Override the default handler for all limiters
const limiters = [generalLimiter, authLimiter, smsLimiter, profileUpdateLimiter];
limiters.forEach(limiter => {
    limiter.handler = rateLimitErrorHandler;
});

module.exports = {
    generalLimiter,
    authLimiter,
    smsLimiter,
    profileUpdateLimiter
};
