const express = require('express')
const router = express.Router()
const Log = require('../../model/Log')
const passport = require('passport')
const NexmoService = require('../../services/nexmo')
const DeliveryStatusService = require('../../services/deliveryStatus')
const validateSmsBody = require('../../validate/sms')
const validateXUsernameMiddleware = require('../../middleware/auth')

/**
 * @route POST api/sms/send
 * @desc Send Spoof SMS with delivery tracking
 * @access Private
 */
 router.post('/send', passport.authenticate('jwt', { session: false} ), validateXUsernameMiddleware.validateXUsername , async (req, res) => {
    const data = validateSmsBody.validate(req.body)
    if(data.error){
        return res.status(400).json({
            msg: 'Invalid body request.',
            details: data.error.details,
            success: false
        })
    }else{

        try {
            // Send SMS through provider
            const response = await NexmoService.sendSms(data.value)
            
            // Extract provider message ID from response
            const providerMessageId = response.data?.messages?.[0]?.['message-id'] || 
                                     response.data?.MessageUuid ||
                                     null;

            // Create delivery log with initial status
            const log = await DeliveryStatusService.createLog({
                username: req.user.username,
                victim: data.value.to,
                message: data.value.text,
                provider: 'nexmo',
                provider_message_id: providerMessageId
            });

            res.json({
                success: true,
                msg: 'SMS sent successfully',
                logId: log._id,
                deliveryStatus: log.delivery_status,
                providerResponse: response.data
            })
        } catch (error) {
            return res.status(500).json({
                msg: error.message,
                success: false
            })
        }
    }

})

/**
 * @route GET api/sms/history/search
 * @desc Advanced SMS history search with text search
 * @access Private
 * @query {string} q - Search term (searches in message and recipient)
 * @query {number} limit - Results per page (default: 20)
 * @query {number} offset - Page offset (default: 0)
 */
router.get('/history/search', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { q = '', limit = 20, offset = 0 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                msg: 'Search query (q) is required'
            });
        }

        const history = await DeliveryStatusService.getAdvancedSmsHistory(
            req.user.username,
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                messageContent: q,
                sortBy: 'created_at',
                sortOrder: -1
            }
        );

        res.json({
            success: true,
            query: q,
            pagination: {
                total: history.total,
                limit: history.limit,
                offset: history.offset,
                page: history.page,
                totalPages: history.totalPages
            },
            data: history.data.map(log => ({
                _id: log._id,
                victim: log.victim,
                message: log.message,
                delivery_status: log.delivery_status,
                provider_used: log.provider_used,
                created_at: log.created_at,
                matchContext: {
                    messageSnippet: log.message.substring(0, 100) + (log.message.length > 100 ? '...' : '')
                }
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
 * @route GET api/sms/history/summary
 * @desc Get SMS history summary statistics
 * @access Private
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 * @query {string} provider - Filter by provider
 */
router.get('/history/summary', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { startDate = null, endDate = null, provider = null } = req.query;

        const summary = await DeliveryStatusService.getSmsHistorySummary(
            req.user.username,
            {
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                provider: provider || null
            }
        );

        res.json({
            success: true,
            summary: {
                byStatus: summary.byStatus,
                byProvider: summary.byProvider,
                dailyStats: summary.dailyStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route GET api/sms/status/:logId
 * @desc Get SMS delivery status by log ID
 * @access Private
 */
router.get('/status/:logId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const log = await DeliveryStatusService.getDeliveryStatus(req.params.logId);

        // Ensure user can only see their own SMS logs
        if (log.username !== req.user.username) {
            return res.status(403).json({
                success: false,
                msg: 'Unauthorized: Cannot access this delivery status'
            });
        }

        res.json({
            success: true,
            data: {
                _id: log._id,
                victim: log.victim,
                message: log.message,
                delivery_status: log.delivery_status,
                provider_used: log.provider_used,
                sent_at: log.sent_at,
                delivered_at: log.delivered_at,
                created_at: log.created_at,
                error_reason: log.error_reason,
                cost: log.cost
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
 * @route GET api/sms/history
 * @desc Get SMS delivery history with advanced filtering
/**
 * @route GET api/sms/history
 * @desc Get SMS delivery history with advanced filtering
 * @access Private
 * @query {number} limit - Results per page (default: 20)
 * @query {number} offset - Page offset (default: 0)
 * @query {string} status - Filter by delivery status (pending, sent, delivered, failed, bounced)
 * @query {string} provider - Filter by SMS provider (nexmo, mailgun, twilio)
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 * @query {string} recipient - Filter by recipient phone number
 * @query {string} search - Search in message content
 * @query {string} sortBy - Sort field (default: created_at)
 * @query {string} sortOrder - Sort order: asc or desc (default: desc)
 * @query {boolean} onlyFailed - Show only failed/bounced messages
 * @query {boolean} onlyDelivered - Show only delivered messages
 * @query {boolean} onlyPending - Show only pending messages
 */
router.get('/history', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            status = null,
            provider = null,
            startDate = null,
            endDate = null,
            recipient = null,
            search = null,
            sortBy = 'created_at',
            sortOrder = 'desc',
            onlyFailed = false,
            onlyDelivered = false,
            onlyPending = false
        } = req.query;

        // Use advanced history method with all filters
        const history = await DeliveryStatusService.getAdvancedSmsHistory(
            req.user.username,
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                status: status || null,
                provider: provider || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                recipientPhone: recipient || null,
                messageContent: search || null,
                sortBy,
                sortOrder: sortOrder === 'asc' ? 1 : -1,
                onlyFailed: onlyFailed === 'true' || onlyFailed === true,
                onlyDelivered: onlyDelivered === 'true' || onlyDelivered === true,
                onlyPending: onlyPending === 'true' || onlyPending === true
            }
        );

        res.json({
            success: true,
            pagination: {
                total: history.total,
                limit: history.limit,
                offset: history.offset,
                page: history.page,
                totalPages: history.totalPages,
                hasMore: history.hasMore
            },
            data: history.data.map(log => ({
                _id: log._id,
                victim: log.victim,
                message: log.message.substring(0, 50) + (log.message.length > 50 ? '...' : ''),
                messageLength: log.message_length,
                numberOfParts: log.number_of_parts,
                delivery_status: log.delivery_status,
                provider_used: log.provider_used,
                created_at: log.created_at,
                sent_at: log.sent_at,
                delivered_at: log.delivered_at,
                error_reason: log.error_reason,
                error_code: log.error_code,
                cost: log.cost,
                currency: log.currency
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
 * @route GET api/sms/stats
 * @desc Get SMS delivery statistics
 * @access Private
 */
router.get('/stats', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const stats = await DeliveryStatusService.getDeliveryStats(req.user.username);

        res.json({
            success: true,
            data: {
                total_sent: stats.total_sent,
                total_delivered: stats.total_delivered,
                total_failed: stats.total_failed,
                total_pending: stats.total_pending,
                total_bounced: stats.total_bounced,
                delivery_rate: stats.delivery_rate.toFixed(2) + '%',
                failure_rate: stats.failure_rate.toFixed(2) + '%'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            msg: error.message
        });
    }
});

/**
 * @route PUT api/sms/status/:logId
 * @desc Update SMS delivery status (admin/webhook)
 * @access Private (should be restricted to admin/webhook verification)
 */
router.put('/status/:logId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { status, error_reason, error_code } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                msg: 'Status is required'
            });
        }

        const updatedLog = await DeliveryStatusService.updateDeliveryStatus(
            req.params.logId,
            status,
            { error_reason, error_code }
        );

        // Ensure user can only update their own logs
        if (updatedLog.username !== req.user.username) {
            return res.status(403).json({
                success: false,
                msg: 'Unauthorized: Cannot update this delivery status'
            });
        }

        res.json({
            success: true,
            msg: 'Delivery status updated',
            data: {
                _id: updatedLog._id,
                delivery_status: updatedLog.delivery_status,
                updated_at: updatedLog.updated_at
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            msg: error.message
        });
    }
});

module.exports = router