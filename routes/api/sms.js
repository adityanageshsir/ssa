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
 * @desc Get SMS delivery history with filtering
 * @access Private
 */
router.get('/history', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { limit = 20, offset = 0, status = null, provider = null } = req.query;

        const history = await DeliveryStatusService.getUserDeliveryHistory(
            req.user.username,
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                status,
                provider,
                sortBy: 'created_at',
                sortOrder: -1
            }
        );

        res.json({
            success: true,
            total: history.total,
            limit: history.limit,
            offset: history.offset,
            data: history.data.map(log => ({
                _id: log._id,
                victim: log.victim,
                message: log.message.substring(0, 50) + (log.message.length > 50 ? '...' : ''),
                delivery_status: log.delivery_status,
                provider_used: log.provider_used,
                created_at: log.created_at,
                sent_at: log.sent_at,
                delivered_at: log.delivered_at,
                error_reason: log.error_reason
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