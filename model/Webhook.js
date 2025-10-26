const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Create webhook schema for managing user webhooks

const WebhookSchema = new Schema({
    /**
     * User Information
     */
    username: {
        type: String,
        required: true,
        index: true
    },

    /**
     * Webhook Configuration
     */
    url: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+/.test(v)
            },
            message: 'Webhook URL must be a valid HTTP/HTTPS URL'
        }
    },

    /**
     * Webhook Name/Description
     */
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        sparse: true
    },

    /**
     * Events Configuration
     * Array of event types this webhook subscribes to
     */
    events: {
        type: [String],
        enum: ['sms.sent', 'sms.delivered', 'sms.failed', 'sms.bounced', 'sms.read'],
        default: ['sms.delivered', 'sms.failed'],
        required: true
    },

    /**
     * Webhook Status
     */
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    /**
     * Security: Webhook Secret for HMAC-SHA256 signature verification
     */
    secret: {
        type: String,
        required: true
    },

    /**
     * Retry Configuration
     */
    retryEnabled: {
        type: Boolean,
        default: true
    },

    retryCount: {
        type: Number,
        default: 3,
        min: 1,
        max: 10
    },

    retryBackoffMs: {
        type: Number,
        default: 5000, // 5 seconds
        min: 1000,
        max: 3600000 // 1 hour
    },

    /**
     * Webhook Statistics
     */
    stats: {
        totalCalls: {
            type: Number,
            default: 0
        },
        successfulCalls: {
            type: Number,
            default: 0
        },
        failedCalls: {
            type: Number,
            default: 0
        },
        lastCall: {
            type: Date,
            sparse: true
        },
        lastCallStatus: {
            type: Number,
            sparse: true
        },
        averageResponseTime: {
            type: Number,
            sparse: true
        }
    },

    /**
     * Notification Preferences
     */
    notifyOnFailure: {
        type: Boolean,
        default: true
    },

    maxPayloadSize: {
        type: Number,
        default: 1048576, // 1MB
        min: 10240, // 10KB
        max: 10485760 // 10MB
    },

    /**
     * Timestamps
     */
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },

    updated_at: {
        type: Date,
        default: Date.now
    },

    lastUpdatedBy: {
        type: String,
        sparse: true
    }
}, {
    timestamps: true,
    collection: 'webhooks'
})

// Indexes for efficient querying
WebhookSchema.index({ username: 1, isActive: 1 })
WebhookSchema.index({ username: 1, created_at: -1 })
WebhookSchema.index({ url: 1 })

module.exports = Webhook = mongoose.model('webhooks', WebhookSchema)
