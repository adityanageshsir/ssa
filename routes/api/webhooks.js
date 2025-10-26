const express = require('express')
const router = express.Router()
const passport = require('passport')
const WebhookService = require('../../services/webhookService')

/**
 * @route POST /api/webhooks
 * @desc Create a new webhook
 * @access Private
 * @body {string} url - Webhook URL (HTTPS required)
 * @body {string} name - Webhook name
 * @body {string} description - Webhook description
 * @body {array} events - Event types to subscribe to
 * @body {number} retryCount - Number of retries (default: 3)
 */
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { url, name, description, events, retryCount, retryBackoffMs, notifyOnFailure } = req.body

        if (!url || !name) {
            return res.status(400).json({
                success: false,
                msg: 'URL and name are required'
            })
        }

        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            return res.status(400).json({
                success: false,
                msg: 'Webhook URL must start with http:// or https://'
            })
        }

        const webhook = await WebhookService.createWebhook({
            username: req.user.username,
            url,
            name,
            description,
            events,
            retryCount,
            retryBackoffMs,
            notifyOnFailure
        })

        res.status(201).json({
            success: true,
            msg: 'Webhook created successfully',
            data: {
                _id: webhook._id,
                url: webhook.url,
                name: webhook.name,
                description: webhook.description,
                events: webhook.events,
                isActive: webhook.isActive,
                secret: webhook.secret,
                created_at: webhook.created_at
            }
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route GET /api/webhooks
 * @desc Get user's webhooks
 * @access Private
 * @query {number} limit - Results per page (default: 20)
 * @query {number} offset - Pagination offset (default: 0)
 * @query {boolean} isActive - Filter by active status
 */
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { limit = 20, offset = 0, isActive = null } = req.query

        const webhooks = await WebhookService.getUserWebhooks(req.user.username, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            isActive: isActive !== null ? isActive === 'true' : null
        })

        res.json({
            success: true,
            pagination: {
                total: webhooks.total,
                limit: webhooks.limit,
                offset: webhooks.offset,
                page: webhooks.page,
                totalPages: webhooks.totalPages,
                hasMore: webhooks.hasMore
            },
            data: webhooks.data.map(webhook => ({
                _id: webhook._id,
                name: webhook.name,
                url: webhook.url,
                events: webhook.events,
                isActive: webhook.isActive,
                stats: webhook.stats,
                created_at: webhook.created_at,
                updated_at: webhook.updated_at
            }))
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route GET /api/webhooks/:webhookId
 * @desc Get specific webhook with full details
 * @access Private
 */
router.get('/:webhookId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const webhook = await WebhookService.getWebhookById(req.params.webhookId, req.user.username)

        res.json({
            success: true,
            data: {
                _id: webhook._id,
                name: webhook.name,
                url: webhook.url,
                description: webhook.description,
                events: webhook.events,
                isActive: webhook.isActive,
                secret: webhook.secret,
                retryEnabled: webhook.retryEnabled,
                retryCount: webhook.retryCount,
                retryBackoffMs: webhook.retryBackoffMs,
                notifyOnFailure: webhook.notifyOnFailure,
                maxPayloadSize: webhook.maxPayloadSize,
                stats: webhook.stats,
                created_at: webhook.created_at,
                updated_at: webhook.updated_at
            }
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route PUT /api/webhooks/:webhookId
 * @desc Update webhook
 * @access Private
 * @body {string} url - Webhook URL
 * @body {string} name - Webhook name
 * @body {array} events - Events to subscribe to
 * @body {boolean} isActive - Webhook active status
 * @body {number} retryCount - Retry count
 */
router.put('/:webhookId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const webhook = await WebhookService.updateWebhook(
            req.params.webhookId,
            req.user.username,
            req.body
        )

        res.json({
            success: true,
            msg: 'Webhook updated successfully',
            data: {
                _id: webhook._id,
                name: webhook.name,
                url: webhook.url,
                events: webhook.events,
                isActive: webhook.isActive,
                updated_at: webhook.updated_at
            }
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route DELETE /api/webhooks/:webhookId
 * @desc Delete webhook
 * @access Private
 */
router.delete('/:webhookId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        await WebhookService.deleteWebhook(req.params.webhookId, req.user.username)

        res.json({
            success: true,
            msg: 'Webhook deleted successfully'
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route POST /api/webhooks/:webhookId/rotate-secret
 * @desc Rotate webhook secret
 * @access Private
 */
router.post('/:webhookId/rotate-secret', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const webhook = await WebhookService.rotateSecret(req.params.webhookId, req.user.username)

        res.json({
            success: true,
            msg: 'Webhook secret rotated successfully',
            data: {
                _id: webhook._id,
                secret: webhook.secret,
                updated_at: webhook.updated_at
            }
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route POST /api/webhooks/:webhookId/test
 * @desc Send test webhook payload
 * @access Private
 */
router.post('/:webhookId/test', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const result = await WebhookService.sendTestWebhook(req.params.webhookId, req.user.username)

        res.json({
            success: result.success,
            msg: result.message,
            data: {
                httpStatusCode: result.httpStatusCode,
                responseTime: result.responseTime,
                error: result.error || null
            }
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route GET /api/webhooks/:webhookId/events
 * @desc Get webhook events/logs
 * @access Private
 * @query {number} limit - Results per page (default: 50)
 * @query {number} offset - Pagination offset
 * @query {string} status - Filter by event status (pending, sent, failed, success)
 * @query {string} eventType - Filter by event type
 * @query {string} startDate - Filter from start date
 * @query {string} endDate - Filter until end date
 */
router.get('/:webhookId/events', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        // Verify webhook ownership
        await WebhookService.getWebhookById(req.params.webhookId, req.user.username)

        const { limit = 50, offset = 0, status = null, eventType = null, startDate = null, endDate = null } = req.query

        const events = await WebhookService.getWebhookEvents(req.params.webhookId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            status,
            eventType,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        })

        res.json({
            success: true,
            pagination: {
                total: events.total,
                limit: events.limit,
                offset: events.offset,
                page: events.page,
                totalPages: events.totalPages,
                hasMore: events.hasMore
            },
            data: events.data.map(event => ({
                _id: event._id,
                eventType: event.eventType,
                status: event.status,
                attempts: event.attempts,
                maxAttempts: event.maxAttempts,
                httpStatusCode: event.httpStatusCode,
                requestDurationMs: event.requestDurationMs,
                lastAttemptError: event.lastAttemptError,
                createdAt: event.createdAt,
                sentAt: event.sentAt,
                nextRetryTime: event.nextRetryTime
            }))
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

/**
 * @route GET /api/webhooks/:webhookId/stats
 * @desc Get webhook statistics
 * @access Private
 */
router.get('/:webhookId/stats', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        // Verify webhook ownership
        await WebhookService.getWebhookById(req.params.webhookId, req.user.username)

        const stats = await WebhookService.getWebhookStats(req.params.webhookId)

        res.json({
            success: true,
            data: stats
        })
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 403).json({
            success: false,
            msg: error.message
        })
    }
})

module.exports = router
