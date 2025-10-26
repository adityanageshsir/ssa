/**
 * Request Logging Service
 * Handles logging, retrieval, and analysis of API requests
 */

const RequestLog = require('../model/RequestLog');

class RequestLoggingService {
    /**
     * Sensitive fields to exclude from request body/headers logging
     */
    static SENSITIVE_FIELDS = [
        'password',
        'token',
        'authorization',
        'authorization_header',
        'api_key',
        'apiKey',
        'secret',
        'creditCard',
        'cardNumber',
        'cvv',
        'ssn',
        'privateKey',
        'refreshToken'
    ];

    /**
     * Sanitize sensitive data from object
     * @param {Object} obj - Object to sanitize
     * @returns {Object} Sanitized object
     */
    static sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

        Object.keys(sanitized).forEach(key => {
            const lowerKey = key.toLowerCase();

            // Check if key is sensitive
            if (this.SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeObject(sanitized[key]);
            }
        });

        return sanitized;
    }

    /**
     * Extract safe headers from request
     * @param {Object} headers - Request headers
     * @returns {Object} Safe headers
     */
    static extractSafeHeaders(headers) {
        if (!headers) return {};

        const safeHeaders = {};
        const allowedHeaders = [
            'user-agent',
            'accept',
            'accept-language',
            'accept-encoding',
            'content-type',
            'content-length',
            'referer',
            'origin',
            'host'
        ];

        Object.keys(headers).forEach(key => {
            if (allowedHeaders.includes(key.toLowerCase())) {
                safeHeaders[key] = headers[key];
            }
        });

        return safeHeaders;
    }

    /**
     * Get client IP address from request
     * @param {Object} req - Express request object
     * @returns {string} Client IP address
     */
    static getClientIp(req) {
        return (
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.socket?.remoteAddress ||
            req.connection?.remoteAddress ||
            'unknown'
        );
    }

    /**
     * Create a new request log
     * @param {Object} logData - Log data
     * @returns {Promise<Object>} Created log document
     */
    static async createRequestLog(logData) {
        try {
            const {
                method,
                route,
                url,
                queryParams,
                requestBody,
                requestHeaders,
                username,
                clientIp,
                userAgent,
                statusCode,
                responseSize,
                responseTime,
                error,
                environment
            } = logData;

            const log = new RequestLog({
                method,
                route,
                url,
                queryParams: queryParams || {},
                requestBody: this.sanitizeObject(requestBody),
                requestHeaders: this.extractSafeHeaders(requestHeaders),
                username: username || null,
                clientIp,
                userAgent,
                statusCode,
                responseSize: responseSize || 0,
                responseTime,
                error: error ? {
                    message: error.message,
                    code: error.code,
                    stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
                } : null,
                environment: environment || process.env.NODE_ENV || 'production',
                timestamp: new Date()
            });

            await log.save();
            return log;
        } catch (error) {
            console.error(`Failed to create request log: ${error.message}`);
            // Don't throw - logging should not break the application
            return null;
        }
    }

    /**
     * Get request logs with filtering
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Paginated logs
     */
    static async getRequestLogs(filters = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                method = null,
                route = null,
                statusCode = null,
                username = null,
                clientIp = null,
                startDate = null,
                endDate = null,
                sortBy = 'timestamp',
                sortOrder = -1
            } = filters;

            const query = {};

            // Add filters
            if (method) query.method = method;
            if (route) query.route = { $regex: route, $options: 'i' };
            if (statusCode) query.statusCode = statusCode;
            if (username) query.username = username;
            if (clientIp) query.clientIp = clientIp;

            // Date range filter
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            const total = await RequestLog.countDocuments(query);
            const logs = await RequestLog.find(query)
                .sort({ [sortBy]: sortOrder })
                .limit(parseInt(limit))
                .skip(parseInt(offset));

            return {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasMore: (parseInt(offset) + parseInt(limit)) < total,
                data: logs
            };
        } catch (error) {
            throw new Error(`Failed to get request logs: ${error.message}`);
        }
    }

    /**
     * Get request log by ID
     * @param {string} logId - Log document ID
     * @returns {Promise<Object>} Log document
     */
    static async getRequestLogById(logId) {
        try {
            const log = await RequestLog.findById(logId);
            if (!log) {
                throw new Error(`Request log not found with ID: ${logId}`);
            }
            return log;
        } catch (error) {
            throw new Error(`Failed to get request log: ${error.message}`);
        }
    }

    /**
     * Get request statistics
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Statistics
     */
    static async getRequestStats(filters = {}) {
        try {
            const {
                startDate = null,
                endDate = null,
                method = null,
                route = null
            } = filters;

            const match = { $match: {} };

            // Add filters to match stage
            if (method) match.$match.method = method;
            if (route) match.$match.route = { $regex: route, $options: 'i' };
            if (startDate || endDate) {
                match.$match.timestamp = {};
                if (startDate) match.$match.timestamp.$gte = new Date(startDate);
                if (endDate) match.$match.timestamp.$lte = new Date(endDate);
            }

            const stats = await RequestLog.aggregate([
                match,
                {
                    $facet: {
                        overallStats: [
                            {
                                $group: {
                                    _id: null,
                                    totalRequests: { $sum: 1 },
                                    totalResponseTime: { $sum: '$responseTime' },
                                    totalResponseSize: { $sum: '$responseSize' },
                                    avgResponseTime: { $avg: '$responseTime' },
                                    avgResponseSize: { $avg: '$responseSize' },
                                    minResponseTime: { $min: '$responseTime' },
                                    maxResponseTime: { $max: '$responseTime' }
                                }
                            }
                        ],
                        byMethod: [
                            {
                                $group: {
                                    _id: '$method',
                                    count: { $sum: 1 },
                                    avgResponseTime: { $avg: '$responseTime' }
                                }
                            },
                            { $sort: { count: -1 } }
                        ],
                        byStatusCode: [
                            {
                                $group: {
                                    _id: '$statusCode',
                                    count: { $sum: 1 },
                                    percentage: {
                                        $divide: [
                                            { $sum: 1 },
                                            { $literal: 100 }
                                        ]
                                    }
                                }
                            },
                            { $sort: { count: -1 } }
                        ],
                        byRoute: [
                            {
                                $group: {
                                    _id: '$route',
                                    count: { $sum: 1 },
                                    avgResponseTime: { $avg: '$responseTime' },
                                    errors: {
                                        $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
                                    }
                                }
                            },
                            { $sort: { count: -1 } },
                            { $limit: 20 }
                        ],
                        slowRequests: [
                            { $sort: { responseTime: -1 } },
                            { $limit: 10 }
                        ],
                        hourlyStats: [
                            {
                                $group: {
                                    _id: {
                                        $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
                                    },
                                    count: { $sum: 1 },
                                    avgResponseTime: { $avg: '$responseTime' },
                                    errors: {
                                        $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
                                    }
                                }
                            },
                            { $sort: { _id: -1 } },
                            { $limit: 24 }
                        ]
                    }
                }
            ]);

            return {
                overallStats: stats[0]?.overallStats?.[0] || {
                    totalRequests: 0,
                    totalResponseTime: 0,
                    totalResponseSize: 0,
                    avgResponseTime: 0,
                    avgResponseSize: 0,
                    minResponseTime: 0,
                    maxResponseTime: 0
                },
                byMethod: stats[0]?.byMethod || [],
                byStatusCode: stats[0]?.byStatusCode || [],
                byRoute: stats[0]?.byRoute || [],
                slowRequests: stats[0]?.slowRequests || [],
                hourlyStats: stats[0]?.hourlyStats || []
            };
        } catch (error) {
            throw new Error(`Failed to get request stats: ${error.message}`);
        }
    }

    /**
     * Get error logs
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Error logs
     */
    static async getErrorLogs(filters = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                startDate = null,
                endDate = null,
                statusCodeMin = 400,
                sortBy = 'timestamp',
                sortOrder = -1
            } = filters;

            const query = {
                statusCode: { $gte: statusCodeMin }
            };

            // Date range filter
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            const total = await RequestLog.countDocuments(query);
            const logs = await RequestLog.find(query)
                .sort({ [sortBy]: sortOrder })
                .limit(parseInt(limit))
                .skip(parseInt(offset));

            return {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasMore: (parseInt(offset) + parseInt(limit)) < total,
                data: logs
            };
        } catch (error) {
            throw new Error(`Failed to get error logs: ${error.message}`);
        }
    }

    /**
     * Get user activity logs
     * @param {string} username - Username
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} User activity logs
     */
    static async getUserActivityLogs(username, filters = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                startDate = null,
                endDate = null,
                sortBy = 'timestamp',
                sortOrder = -1
            } = filters;

            const query = { username };

            // Date range filter
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            const total = await RequestLog.countDocuments(query);
            const logs = await RequestLog.find(query)
                .sort({ [sortBy]: sortOrder })
                .limit(parseInt(limit))
                .skip(parseInt(offset));

            return {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasMore: (parseInt(offset) + parseInt(limit)) < total,
                data: logs
            };
        } catch (error) {
            throw new Error(`Failed to get user activity logs: ${error.message}`);
        }
    }

    /**
     * Clean up old logs (older than specified days)
     * @param {number} daysOld - Delete logs older than this many days
     * @returns {Promise<Object>} Deletion result
     */
    static async cleanupOldLogs(daysOld = 30) {
        try {
            const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
            const result = await RequestLog.deleteMany({ timestamp: { $lt: cutoffDate } });

            return {
                success: true,
                deletedCount: result.deletedCount,
                message: `Deleted ${result.deletedCount} logs older than ${daysOld} days`
            };
        } catch (error) {
            throw new Error(`Failed to cleanup old logs: ${error.message}`);
        }
    }
}

module.exports = RequestLoggingService;
