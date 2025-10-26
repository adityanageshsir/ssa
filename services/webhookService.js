/**
 * Webhook Service
 * Handles webhook management, event delivery, and retry logic
 */

const crypto = require('crypto')
const axios = require('axios')
const Webhook = require('../model/Webhook')
const WebhookEvent = require('../model/WebhookEvent')

class WebhookService {
    /**
     * Generate secure webhook secret
     * @returns {string} Random 32-character hex string
     */
    static generateSecret() {
        return crypto.randomBytes(16).toString('hex')
    }

    /**
     * Create HMAC-SHA256 signature for webhook payload
     * @param {string} payload - JSON payload
     * @param {string} secret - Webhook secret
     * @returns {string} Signature hash
     */
    static generateSignature(payload, secret) {
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex')
    }

    /**
     * Verify webhook signature
     * @param {string} payload - JSON payload
     * @param {string} signature - Provided signature
     * @param {string} secret - Webhook secret
     * @returns {boolean} True if signature is valid
     */
    static verifySignature(payload, signature, secret) {
        const expectedSignature = this.generateSignature(payload, secret)
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    }

    /**
     * Create a new webhook
     * @param {Object} data - Webhook data
     * @returns {Promise<Object>} Created webhook
     */
    static async createWebhook(data) {
        try {
            const {
                username,
                url,
                name,
                description,
                events,
                retryCount,
                retryBackoffMs,
                notifyOnFailure
            } = data

            const webhook = new Webhook({
                username,
                url,
                name,
                description,
                events: events || ['sms.delivered', 'sms.failed'],
                secret: this.generateSecret(),
                retryCount: retryCount || 3,
                retryBackoffMs: retryBackoffMs || 5000,
                notifyOnFailure: notifyOnFailure !== false
            })

            await webhook.save()
            return webhook
        } catch (error) {
            throw new Error(`Failed to create webhook: ${error.message}`)
        }
    }

    /**
     * Get webhooks for a user
     * @param {string} username - Username
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Paginated webhooks
     */
    static async getUserWebhooks(username, filters = {}) {
        try {
            const {
                limit = 20,
                offset = 0,
                isActive = null,
                sortBy = 'created_at',
                sortOrder = -1
            } = filters

            const query = { username }
            if (isActive !== null) query.isActive = isActive

            const total = await Webhook.countDocuments(query)
            const webhooks = await Webhook.find(query)
                .select('-secret') // Don't return secret in list
                .sort({ [sortBy]: sortOrder })
                .limit(parseInt(limit))
                .skip(parseInt(offset))

            return {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasMore: (parseInt(offset) + parseInt(limit)) < total,
                data: webhooks
            }
        } catch (error) {
            throw new Error(`Failed to get webhooks: ${error.message}`)
        }
    }

    /**
     * Get webhook by ID
     * @param {string} webhookId - Webhook ID
     * @param {string} username - Username (for authorization)
     * @returns {Promise<Object>} Webhook document
     */
    static async getWebhookById(webhookId, username) {
        try {
            const webhook = await Webhook.findById(webhookId)
            if (!webhook) {
                throw new Error(`Webhook not found with ID: ${webhookId}`)
            }
            if (webhook.username !== username) {
                throw new Error('Unauthorized: Cannot access this webhook')
            }
            return webhook
        } catch (error) {
            throw new Error(`Failed to get webhook: ${error.message}`)
        }
    }

    /**
     * Update webhook
     * @param {string} webhookId - Webhook ID
     * @param {string} username - Username (for authorization)
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated webhook
     */
    static async updateWebhook(webhookId, username, updates) {
        try {
            const webhook = await Webhook.findById(webhookId)
            if (!webhook) {
                throw new Error(`Webhook not found with ID: ${webhookId}`)
            }
            if (webhook.username !== username) {
                throw new Error('Unauthorized: Cannot update this webhook')
            }

            // Allowed fields to update
            const allowedFields = ['url', 'name', 'description', 'events', 'isActive', 'retryCount', 'retryBackoffMs', 'notifyOnFailure']
            allowedFields.forEach(field => {
                if (field in updates) {
                    webhook[field] = updates[field]
                }
            })

            webhook.updated_at = new Date()
            webhook.lastUpdatedBy = username
            await webhook.save()
            return webhook
        } catch (error) {
            throw new Error(`Failed to update webhook: ${error.message}`)
        }
    }

    /**
     * Delete webhook
     * @param {string} webhookId - Webhook ID
     * @param {string} username - Username (for authorization)
     * @returns {Promise<Object>} Deletion result
     */
    static async deleteWebhook(webhookId, username) {
        try {
            const webhook = await Webhook.findById(webhookId)
            if (!webhook) {
                throw new Error(`Webhook not found with ID: ${webhookId}`)
            }
            if (webhook.username !== username) {
                throw new Error('Unauthorized: Cannot delete this webhook')
            }

            await Webhook.deleteOne({ _id: webhookId })
            return { success: true, message: 'Webhook deleted successfully' }
        } catch (error) {
            throw new Error(`Failed to delete webhook: ${error.message}`)
        }
    }

    /**
     * Rotate webhook secret
     * @param {string} webhookId - Webhook ID
     * @param {string} username - Username (for authorization)
     * @returns {Promise<Object>} Webhook with new secret
     */
    static async rotateSecret(webhookId, username) {
        try {
            const webhook = await Webhook.findById(webhookId)
            if (!webhook) {
                throw new Error(`Webhook not found with ID: ${webhookId}`)
            }
            if (webhook.username !== username) {
                throw new Error('Unauthorized: Cannot rotate secret')
            }

            webhook.secret = this.generateSecret()
            webhook.updated_at = new Date()
            await webhook.save()
            return webhook
        } catch (error) {
            throw new Error(`Failed to rotate secret: ${error.message}`)
        }
    }

    /**
     * Trigger webhook event
     * @param {string} username - Username
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     * @returns {Promise<void>}
     */
    static async triggerEvent(username, eventType, eventData) {
        try {
            // Find all active webhooks subscribed to this event
            const webhooks = await Webhook.find({
                username,
                isActive: true,
                events: eventType
            })

            for (const webhook of webhooks) {
                // Create event record
                await this.queueWebhookEvent(webhook, eventType, eventData)
            }
        } catch (error) {
            console.error(`Failed to trigger webhook event: ${error.message}`)
        }
    }

    /**
     * Queue webhook event for delivery
     * @param {Object} webhook - Webhook document
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} Created webhook event
     */
    static async queueWebhookEvent(webhook, eventType, eventData) {
        try {
            const webhookEvent = new WebhookEvent({
                webhookId: webhook._id,
                logId: eventData.logId || null,
                eventType,
                payload: eventData,
                status: 'pending',
                maxAttempts: webhook.retryCount
            })

            await webhookEvent.save()

            // Send webhook immediately (async)
            setImmediate(() => {
                this.sendWebhookEvent(webhook, webhookEvent)
            })

            return webhookEvent
        } catch (error) {
            console.error(`Failed to queue webhook event: ${error.message}`)
        }
    }

    /**
     * Send webhook event to URL
     * @param {Object} webhook - Webhook document
     * @param {Object} webhookEvent - Webhook event document
     * @returns {Promise<void>}
     */
    static async sendWebhookEvent(webhook, webhookEvent) {
        try {
            const payload = JSON.stringify({
                event: webhookEvent.eventType,
                timestamp: new Date().toISOString(),
                data: webhookEvent.payload
            })

            const signature = this.generateSignature(payload, webhook.secret)

            const startTime = Date.now()

            const response = await axios.post(webhook.url, webhookEvent.payload, {
                headers: {
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': webhookEvent.eventType,
                    'X-Webhook-Delivery': webhookEvent._id.toString(),
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
                maxContentLength: webhook.maxPayloadSize,
                maxBodyLength: webhook.maxPayloadSize
            })

            const duration = Date.now() - startTime

            // Update event as successful
            webhookEvent.status = 'success'
            webhookEvent.sentAt = new Date()
            webhookEvent.httpStatusCode = response.status
            webhookEvent.requestDurationMs = duration
            await webhookEvent.save()

            // Update webhook stats
            await Webhook.findByIdAndUpdate(webhook._id, {
                $inc: {
                    'stats.totalCalls': 1,
                    'stats.successfulCalls': 1
                },
                'stats.lastCall': new Date(),
                'stats.lastCallStatus': response.status,
                'stats.averageResponseTime': duration
            })
        } catch (error) {
            webhookEvent.attempts += 1
            webhookEvent.lastAttemptTime = new Date()
            webhookEvent.lastAttemptError = error.message

            if (webhookEvent.attempts < webhookEvent.maxAttempts) {
                // Schedule retry
                const backoffMs = webhook.retryBackoffMs * Math.pow(2, webhookEvent.attempts - 1)
                webhookEvent.nextRetryTime = new Date(Date.now() + backoffMs)
                webhookEvent.status = 'pending'
            } else {
                // Max retries exceeded
                webhookEvent.status = 'failed'
            }

            await webhookEvent.save()

            // Update webhook stats
            await Webhook.findByIdAndUpdate(webhook._id, {
                $inc: {
                    'stats.totalCalls': 1,
                    'stats.failedCalls': 1
                },
                'stats.lastCall': new Date(),
                'stats.lastCallStatus': -1
            })

            console.error(`Webhook delivery failed for ${webhook.url}: ${error.message}`)
        }
    }

    /**
     * Retry failed webhook events
     * @returns {Promise<Object>} Retry results
     */
    static async retryFailedEvents() {
        try {
            const now = new Date()
            const retryEvents = await WebhookEvent.find({
                status: 'pending',
                nextRetryTime: { $lte: now }
            }).populate('webhookId')

            const results = {
                processed: 0,
                successful: 0,
                failed: 0
            }

            for (const event of retryEvents) {
                results.processed++
                try {
                    await this.sendWebhookEvent(event.webhookId, event)
                    results.successful++
                } catch (error) {
                    results.failed++
                    console.error(`Retry failed for event ${event._id}: ${error.message}`)
                }
            }

            return results
        } catch (error) {
            throw new Error(`Failed to retry webhook events: ${error.message}`)
        }
    }

    /**
     * Get webhook events
     * @param {string} webhookId - Webhook ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Paginated events
     */
    static async getWebhookEvents(webhookId, filters = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                status = null,
                eventType = null,
                startDate = null,
                endDate = null,
                sortBy = 'createdAt',
                sortOrder = -1
            } = filters

            const query = { webhookId }
            if (status) query.status = status
            if (eventType) query.eventType = eventType
            if (startDate || endDate) {
                query.createdAt = {}
                if (startDate) query.createdAt.$gte = new Date(startDate)
                if (endDate) query.createdAt.$lte = new Date(endDate)
            }

            const total = await WebhookEvent.countDocuments(query)
            const events = await WebhookEvent.find(query)
                .sort({ [sortBy]: sortOrder })
                .limit(parseInt(limit))
                .skip(parseInt(offset))

            return {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasMore: (parseInt(offset) + parseInt(limit)) < total,
                data: events
            }
        } catch (error) {
            throw new Error(`Failed to get webhook events: ${error.message}`)
        }
    }

    /**
     * Send test webhook
     * @param {string} webhookId - Webhook ID
     * @param {string} username - Username (for authorization)
     * @returns {Promise<Object>} Test result
     */
    static async sendTestWebhook(webhookId, username) {
        try {
            const webhook = await this.getWebhookById(webhookId, username)

            const testData = {
                event: 'webhook.test',
                timestamp: new Date().toISOString(),
                data: {
                    logId: '000000000000000000000000',
                    provider: 'test',
                    recipient: '+1234567890',
                    status: 'delivered',
                    messageId: 'test-msg-id',
                    cost: 0.067,
                    message: 'This is a test webhook delivery'
                }
            }

            const payload = JSON.stringify(testData)
            const signature = this.generateSignature(payload, webhook.secret)

            const startTime = Date.now()

            try {
                const response = await axios.post(webhook.url, testData, {
                    headers: {
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event': 'webhook.test',
                        'X-Webhook-Delivery': 'test-' + Date.now(),
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000,
                    maxContentLength: webhook.maxPayloadSize
                })

                const duration = Date.now() - startTime

                return {
                    success: true,
                    httpStatusCode: response.status,
                    responseTime: duration,
                    message: 'Test webhook sent successfully'
                }
            } catch (error) {
                const duration = Date.now() - startTime
                return {
                    success: false,
                    httpStatusCode: error.response?.status,
                    responseTime: duration,
                    error: error.message,
                    message: 'Test webhook failed'
                }
            }
        } catch (error) {
            throw new Error(`Failed to send test webhook: ${error.message}`)
        }
    }

    /**
     * Get webhook statistics
     * @param {string} webhookId - Webhook ID
     * @returns {Promise<Object>} Statistics
     */
    static async getWebhookStats(webhookId) {
        try {
            const webhook = await Webhook.findById(webhookId)
            if (!webhook) {
                throw new Error(`Webhook not found with ID: ${webhookId}`)
            }

            const events = await WebhookEvent.aggregate([
                { $match: { webhookId: mongoose.Types.ObjectId(webhookId) } },
                {
                    $facet: {
                        overview: [
                            {
                                $group: {
                                    _id: null,
                                    totalEvents: { $sum: 1 },
                                    successCount: {
                                        $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                                    },
                                    failedCount: {
                                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                                    },
                                    pendingCount: {
                                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                                    }
                                }
                            }
                        ],
                        byEventType: [
                            {
                                $group: {
                                    _id: '$eventType',
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { count: -1 } }
                        ],
                        recentEvents: [
                            { $sort: { createdAt: -1 } },
                            { $limit: 10 }
                        ]
                    }
                }
            ])

            return {
                webhook: {
                    _id: webhook._id,
                    name: webhook.name,
                    url: webhook.url,
                    isActive: webhook.isActive,
                    stats: webhook.stats
                },
                eventStats: events[0] || {}
            }
        } catch (error) {
            throw new Error(`Failed to get webhook stats: ${error.message}`)
        }
    }
}

module.exports = WebhookService
