const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Create webhook event schema for logging webhook calls

const WebhookEventSchema = new Schema({
    /**
     * Webhook Reference
     */
    webhookId: {
        type: Schema.Types.ObjectId,
        ref: 'webhooks',
        required: true,
        index: true
    },

    /**
     * Related SMS Log
     */
    logId: {
        type: Schema.Types.ObjectId,
        ref: 'logs',
        sparse: true,
        index: true
    },

    /**
     * Event Information
     */
    eventType: {
        type: String,
        enum: ['sms.sent', 'sms.delivered', 'sms.failed', 'sms.bounced', 'sms.read'],
        required: true,
        index: true
    },

    /**
     * Event Payload
     */
    payload: {
        type: Schema.Types.Mixed,
        required: true
    },

    /**
     * Retry Information
     */
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'success'],
        default: 'pending',
        index: true
    },

    /**
     * HTTP Response Information
     */
    httpStatusCode: {
        type: Number,
        sparse: true
    },

    httpResponseBody: {
        type: String,
        sparse: true
    },

    /**
     * Retry Attempts
     */
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },

    maxAttempts: {
        type: Number,
        default: 3,
        min: 1
    },

    lastAttemptTime: {
        type: Date,
        sparse: true
    },

    lastAttemptError: {
        type: String,
        sparse: true
    },

    /**
     * Next Retry Schedule
     */
    nextRetryTime: {
        type: Date,
        sparse: true,
        index: true
    },

    /**
     * Request/Response Metrics
     */
    requestDurationMs: {
        type: Number,
        sparse: true
    },

    /**
     * Signature for verification
     */
    signature: {
        type: String,
        sparse: true
    },

    /**
     * Timestamps
     */
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    sentAt: {
        type: Date,
        sparse: true
    }
}, {
    timestamps: true,
    collection: 'webhook_events'
})

// Indexes for efficient querying
WebhookEventSchema.index({ webhookId: 1, createdAt: -1 })
WebhookEventSchema.index({ webhookId: 1, status: 1 })
WebhookEventSchema.index({ status: 1, nextRetryTime: 1 })
WebhookEventSchema.index({ eventType: 1, createdAt: -1 })
WebhookEventSchema.index({ logId: 1, eventType: 1 })

// TTL Index: Auto-delete webhook events older than 90 days (7776000 seconds)
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 })

module.exports = WebhookEvent = mongoose.model('webhook_events', WebhookEventSchema)
