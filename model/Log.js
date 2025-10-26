const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Create SMS log schema for tracking delivery status

const LogSchema = new Schema({
    username: {
        type: String,
        required: true,
        index: true
    },
    victim: {
        type: String,
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    send_status: {
        type: Boolean,
        required: true,
        default: true
    },
    /**
     * Delivery Status Tracking
     * - pending: SMS sent to provider, awaiting confirmation
     * - sent: Provider acknowledged receipt
     * - delivered: SMS successfully delivered to recipient
     * - failed: Delivery failed
     * - bounced: Invalid number or network issue
     */
    delivery_status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
        default: 'pending',
        index: true
    },
    /**
     * SMS Provider Used
     * - nexmo: Nexmo/Vonage provider
     * - mailgun: Mailgun provider
     * - twilio: Twilio provider (future)
     */
    provider_used: {
        type: String,
        enum: ['nexmo', 'mailgun', 'twilio'],
        default: 'nexmo'
    },
    /**
     * Provider Response ID
     * Unique ID from SMS provider for tracking
     */
    provider_message_id: {
        type: String,
        sparse: true
    },
    /**
     * Error Details (if delivery failed)
     * Stores error reason/code from provider
     */
    error_reason: {
        type: String,
        sparse: true
    },
    error_code: {
        type: String,
        sparse: true
    },
    /**
     * Timestamps
     */
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    sent_at: {
        type: Date,
        sparse: true
    },
    delivered_at: {
        type: Date,
        sparse: true
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    /**
     * Cost Information (optional)
     * For billing/analytics
     */
    cost: {
        type: Number,
        sparse: true
    },
    currency: {
        type: String,
        default: 'USD',
        sparse: true
    },
    /**
     * Message Metadata
     */
    message_length: {
        type: Number,
        default: 0
    },
    number_of_parts: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true,
    collection: 'logs'
})

// Index for efficient querying
LogSchema.index({ username: 1, created_at: -1 })
LogSchema.index({ victim: 1, created_at: -1 })
LogSchema.index({ delivery_status: 1, created_at: -1 })
LogSchema.index({ provider_message_id: 1 })

module.exports = Log = mongoose.model('logs', LogSchema)