const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Create request log schema for tracking API requests

const RequestLogSchema = new Schema({
    /**
     * Request Information
     */
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        index: true
    },
    /**
     * Request Route/Path
     */
    route: {
        type: String,
        required: true,
        index: true
    },
    /**
     * Full URL including query string
     */
    url: {
        type: String,
        required: true
    },
    /**
     * Query Parameters
     */
    queryParams: {
        type: Schema.Types.Mixed,
        default: {}
    },
    /**
     * Request Body (excluding sensitive data)
     * Sanitized to remove passwords and sensitive fields
     */
    requestBody: {
        type: Schema.Types.Mixed,
        sparse: true
    },
    /**
     * Request Headers (sanitized)
     * Removes authorization and sensitive headers
     */
    requestHeaders: {
        type: Schema.Types.Mixed,
        sparse: true
    },
    /**
     * Client/User Information
     */
    username: {
        type: String,
        sparse: true,
        index: true
    },
    clientIp: {
        type: String,
        sparse: true
    },
    userAgent: {
        type: String,
        sparse: true
    },
    /**
     * Response Information
     */
    statusCode: {
        type: Number,
        required: true,
        index: true
    },
    /**
     * Response Size in bytes
     */
    responseSize: {
        type: Number,
        default: 0
    },
    /**
     * Response Time in milliseconds
     */
    responseTime: {
        type: Number,
        required: true
    },
    /**
     * Error Information (if response was an error)
     */
    error: {
        message: String,
        code: String,
        stack: String,
        sparse: true
    },
    /**
     * Request Metadata
     */
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    /**
     * Additional Context
     */
    environment: {
        type: String,
        default: 'production'
    },
    version: {
        type: String,
        sparse: true
    }
}, {
    timestamps: true,
    collection: 'request_logs'
})

// Indexes for efficient querying
RequestLogSchema.index({ username: 1, timestamp: -1 })
RequestLogSchema.index({ route: 1, timestamp: -1 })
RequestLogSchema.index({ statusCode: 1, timestamp: -1 })
RequestLogSchema.index({ method: 1, route: 1, timestamp: -1 })
RequestLogSchema.index({ clientIp: 1, timestamp: -1 })
RequestLogSchema.index({ timestamp: -1 })

// TTL Index: Auto-delete logs older than 30 days (2592000 seconds)
RequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 })

module.exports = RequestLog = mongoose.model('request_logs', RequestLogSchema)
