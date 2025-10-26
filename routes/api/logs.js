const express = require('express')
const router = express.Router()
const passport = require('passport')
const RequestLoggingService = require('../../services/requestLogger')

/**
 * @route GET /api/logs/requests
 * @desc Get request logs with filtering and pagination
 * @access Private (Admin only recommended)
 * @query {number} limit - Results per page (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 * @query {string} method - Filter by HTTP method (GET, POST, etc.)
 * @query {string} route - Filter by route (regex)
 * @query {number} statusCode - Filter by status code
 * @query {string} username - Filter by username
 * @query {string} clientIp - Filter by client IP
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 * @query {string} sortBy - Sort field (default: timestamp)
 * @query {string} sortOrder - Sort order: asc or desc (default: desc)
 */
router.get('/requests', passport.authenticate('jwt', { session: false }), async (req, res) => {
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
            sortOrder = 'desc'
        } = req.query;

        // Note: Consider adding admin check here in production
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         msg: 'Unauthorized: Admin access required'
        //     });
        // }

        const logs = await RequestLoggingService.getRequestLogs({
            limit: parseInt(limit),
            offset: parseInt(offset),
            method: method || null,
            route: route || null,
            statusCode: statusCode ? parseInt(statusCode) : null,
            username: username || null,
            clientIp: clientIp || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            sortBy,
            sortOrder: sortOrder === 'asc' ? 1 : -1
        });

        res.json({
            success: true,
            pagination: {
                total: logs.total,
                limit: logs.limit,
                offset: logs.offset,
                page: logs.page,
                totalPages: logs.totalPages,
                hasMore: logs.hasMore
            },
            data: logs.data.map(log => ({
                _id: log._id,
                method: log.method,
                route: log.route,
                url: log.url,
                statusCode: log.statusCode,
                responseTime: log.responseTime,
                username: log.username,
                clientIp: log.clientIp,
                timestamp: log.timestamp,
                error: log.error ? {
                    message: log.error.message,
                    code: log.error.code
                } : null
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route GET /api/logs/requests/:logId
 * @desc Get request log by ID
 * @access Private (Admin only recommended)
 */
router.get('/requests/:logId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const log = await RequestLoggingService.getRequestLogById(req.params.logId);

        res.json({
            success: true,
            data: {
                _id: log._id,
                method: log.method,
                route: log.route,
                url: log.url,
                queryParams: log.queryParams,
                requestBody: log.requestBody,
                requestHeaders: log.requestHeaders,
                statusCode: log.statusCode,
                responseSize: log.responseSize,
                responseTime: log.responseTime,
                username: log.username,
                clientIp: log.clientIp,
                userAgent: log.userAgent,
                timestamp: log.timestamp,
                error: log.error
            }
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route GET /api/logs/requests/stats/overview
 * @desc Get request statistics and analytics
 * @access Private (Admin only recommended)
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 * @query {string} method - Filter by HTTP method
 * @query {string} route - Filter by route (regex)
 */
router.get('/requests/stats/overview', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const {
            startDate = null,
            endDate = null,
            method = null,
            route = null
        } = req.query;

        const stats = await RequestLoggingService.getRequestStats({
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            method: method || null,
            route: route || null
        });

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route GET /api/logs/errors
 * @desc Get error logs (status code >= 400)
 * @access Private (Admin only recommended)
 * @query {number} limit - Results per page (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 * @query {number} statusCodeMin - Minimum status code (default: 400)
 */
router.get('/errors', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const {
            limit = 50,
            offset = 0,
            startDate = null,
            endDate = null,
            statusCodeMin = 400
        } = req.query;

        const errorLogs = await RequestLoggingService.getErrorLogs({
            limit: parseInt(limit),
            offset: parseInt(offset),
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            statusCodeMin: parseInt(statusCodeMin)
        });

        res.json({
            success: true,
            pagination: {
                total: errorLogs.total,
                limit: errorLogs.limit,
                offset: errorLogs.offset,
                page: errorLogs.page,
                totalPages: errorLogs.totalPages,
                hasMore: errorLogs.hasMore
            },
            data: errorLogs.data.map(log => ({
                _id: log._id,
                method: log.method,
                route: log.route,
                url: log.url,
                statusCode: log.statusCode,
                responseTime: log.responseTime,
                username: log.username,
                clientIp: log.clientIp,
                timestamp: log.timestamp,
                error: log.error
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route GET /api/logs/activity/user/:username
 * @desc Get user activity logs
 * @access Private (Own activity or admin)
 * @query {number} limit - Results per page (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 */
router.get('/activity/user/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { username } = req.params;
        const {
            limit = 50,
            offset = 0,
            startDate = null,
            endDate = null
        } = req.query;

        // Authorization check - users can only view their own activity (or admin can view all)
        // if (req.user.username !== username && req.user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         msg: 'Unauthorized: Cannot view other user\'s activity'
        //     });
        // }

        const activityLogs = await RequestLoggingService.getUserActivityLogs(
            username,
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        );

        res.json({
            success: true,
            username,
            pagination: {
                total: activityLogs.total,
                limit: activityLogs.limit,
                offset: activityLogs.offset,
                page: activityLogs.page,
                totalPages: activityLogs.totalPages,
                hasMore: activityLogs.hasMore
            },
            data: activityLogs.data.map(log => ({
                _id: log._id,
                method: log.method,
                route: log.route,
                url: log.url,
                statusCode: log.statusCode,
                responseTime: log.responseTime,
                clientIp: log.clientIp,
                timestamp: log.timestamp
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route DELETE /api/logs/cleanup
 * @desc Clean up old request logs (older than specified days)
 * @access Private (Admin only recommended)
 * @body {number} daysOld - Delete logs older than this many days (default: 30)
 */
router.delete('/cleanup', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;

        // Note: Add admin check in production
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         msg: 'Unauthorized: Admin access required'
        //     });
        // }

        if (daysOld < 1 || daysOld > 365) {
            return res.status(400).json({
                success: false,
                msg: 'daysOld must be between 1 and 365'
            });
        }

        const result = await RequestLoggingService.cleanupOldLogs(daysOld);

        res.json({
            success: true,
            message: result.message,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

module.exports = router;
