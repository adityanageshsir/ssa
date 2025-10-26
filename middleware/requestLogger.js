/**
 * Request Logging Middleware
 * Logs all API requests with detailed information for auditing and analytics
 */

const RequestLoggingService = require('../services/requestLogger');

/**
 * Create request logging middleware
 * Logs request/response details for debugging and monitoring
 *
 * Features:
 * - Tracks method, route, URL, query parameters
 * - Captures response status code and time
 * - Records user information (if authenticated)
 * - Sanitizes sensitive data (passwords, tokens)
 * - Stores safe headers and client information
 * - Handles errors gracefully
 *
 * @returns {Function} Express middleware function
 */
function requestLoggingMiddleware() {
    return async (req, res, next) => {
        // Record start time
        const startTime = Date.now();

        // Store original send/json functions
        const originalSend = res.send;
        const originalJson = res.json;

        let responseBody = '';
        let responseSize = 0;

        /**
         * Override res.send to capture response
         */
        res.send = function (data) {
            if (data) {
                responseBody = data;
                responseSize = Buffer.byteLength(data, 'utf8');
            }
            return originalSend.call(this, data);
        };

        /**
         * Override res.json to capture JSON response
         */
        res.json = function (data) {
            if (data) {
                responseBody = JSON.stringify(data);
                responseSize = Buffer.byteLength(responseBody, 'utf8');
            }
            return originalJson.call(this, data);
        };

        /**
         * Capture response finish event
         */
        res.on('finish', async () => {
            try {
                const responseTime = Date.now() - startTime;

                // Extract user information
                const username = req.user?.username || null;

                // Extract request information
                const method = req.method;
                const route = req.baseUrl || req.path || 'unknown';
                const url = req.originalUrl || req.url;
                const queryParams = req.query || {};
                const requestBody = ['GET', 'HEAD', 'DELETE'].includes(method)
                    ? null
                    : req.body;

                // Extract client information
                const clientIp = RequestLoggingService.getClientIp(req);
                const userAgent = req.get('user-agent');

                // Response information
                const statusCode = res.statusCode;

                // Determine if response is an error
                const error = statusCode >= 400
                    ? {
                        message: responseBody?.message || 'HTTP Error',
                        code: statusCode.toString(),
                        stack: null
                    }
                    : null;

                // Create log asynchronously (don't block response)
                await RequestLoggingService.createRequestLog({
                    method,
                    route,
                    url,
                    queryParams,
                    requestBody,
                    requestHeaders: req.headers,
                    username,
                    clientIp,
                    userAgent,
                    statusCode,
                    responseSize,
                    responseTime,
                    error,
                    environment: process.env.NODE_ENV || 'production'
                });
            } catch (error) {
                // Silently fail - logging should not break the application
                console.error('Request logging error:', error.message);
            }
        });

        next();
    };
}

module.exports = requestLoggingMiddleware;
