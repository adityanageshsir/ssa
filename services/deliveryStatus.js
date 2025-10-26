/**
 * SMS Delivery Status Service
 * Handles tracking and updating SMS delivery status
 */

const Log = require('../model/Log');

class DeliveryStatusService {
    /**
     * Create a new SMS log with initial status
     * @param {Object} data - SMS data
     * @param {string} data.username - User who sent SMS
     * @param {string} data.victim - Recipient phone number
     * @param {string} data.message - Message content
     * @param {string} data.provider - SMS provider (nexmo, mailgun, twilio)
     * @param {string} data.provider_message_id - Provider's message ID
     * @returns {Promise<Object>} Created log document
     */
    static async createLog(data) {
        try {
            const log = new Log({
                username: data.username,
                victim: data.victim,
                message: data.message,
                send_status: true,
                delivery_status: 'pending',
                provider_used: data.provider || 'nexmo',
                provider_message_id: data.provider_message_id || null,
                message_length: data.message.length,
                number_of_parts: Math.ceil(data.message.length / 160),
                created_at: new Date(),
                sent_at: new Date()
            });

            await log.save();
            return log;
        } catch (error) {
            throw new Error(`Failed to create delivery log: ${error.message}`);
        }
    }

    /**
     * Update SMS delivery status
     * @param {string} logId - Log document ID
     * @param {string} status - New delivery status
     * @param {Object} options - Additional update options
     * @returns {Promise<Object>} Updated log document
     */
    static async updateDeliveryStatus(logId, status, options = {}) {
        try {
            const validStatuses = ['pending', 'sent', 'delivered', 'failed', 'bounced'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}`);
            }

            const updateData = {
                delivery_status: status,
                updated_at: new Date()
            };

            // Update relevant timestamps based on status
            if (status === 'sent') {
                updateData.sent_at = new Date();
            } else if (status === 'delivered') {
                updateData.delivered_at = new Date();
            }

            // Add error info if delivery failed
            if (status === 'failed' || status === 'bounced') {
                if (options.error_reason) updateData.error_reason = options.error_reason;
                if (options.error_code) updateData.error_code = options.error_code;
                updateData.send_status = false;
            }

            // Add cost information if provided
            if (options.cost) updateData.cost = options.cost;
            if (options.currency) updateData.currency = options.currency;

            const updatedLog = await Log.findByIdAndUpdate(
                logId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedLog) {
                throw new Error(`Log not found with ID: ${logId}`);
            }

            return updatedLog;
        } catch (error) {
            throw new Error(`Failed to update delivery status: ${error.message}`);
        }
    }

    /**
     * Get delivery status by log ID
     * @param {string} logId - Log document ID
     * @returns {Promise<Object>} Log document with status
     */
    static async getDeliveryStatus(logId) {
        try {
            const log = await Log.findById(logId);
            if (!log) {
                throw new Error(`Log not found with ID: ${logId}`);
            }
            return log;
        } catch (error) {
            throw new Error(`Failed to get delivery status: ${error.message}`);
        }
    }

    /**
     * Get delivery status by provider message ID
     * @param {string} providerMessageId - Provider's message ID
     * @returns {Promise<Object>} Log document
     */
    static async getDeliveryStatusByProviderId(providerMessageId) {
        try {
            const log = await Log.findOne({ provider_message_id: providerMessageId });
            if (!log) {
                throw new Error(`Log not found with provider ID: ${providerMessageId}`);
            }
            return log;
        } catch (error) {
            throw new Error(`Failed to get delivery status: ${error.message}`);
        }
    }

    /**
     * Get user's SMS delivery history with filters
     * @param {string} username - Username to query
     * @param {Object} options - Filter options
     * @returns {Promise<Object>} Paginated results
     */
    static async getUserDeliveryHistory(username, options = {}) {
        try {
            const {
                limit = 20,
                offset = 0,
                status = null,
                startDate = null,
                endDate = null,
                provider = null,
                sortBy = 'created_at',
                sortOrder = -1
            } = options;

            const query = { username };

            // Add filters
            if (status) query.delivery_status = status;
            if (provider) query.provider_used = provider;

            // Date range filter
            if (startDate || endDate) {
                query.created_at = {};
                if (startDate) query.created_at.$gte = new Date(startDate);
                if (endDate) query.created_at.$lte = new Date(endDate);
            }

            const total = await Log.countDocuments(query);
            const logs = await Log.find(query)
                .sort({ [sortBy]: sortOrder })
                .limit(limit)
                .skip(offset);

            return {
                total,
                limit,
                offset,
                data: logs
            };
        } catch (error) {
            throw new Error(`Failed to get delivery history: ${error.message}`);
        }
    }

    /**
     * Get advanced filtered SMS history with search capabilities
     * @param {string} username - Username
     * @param {Object} filters - Advanced filter options
     * @returns {Promise<Object>} Paginated results with metadata
     */
    static async getAdvancedSmsHistory(username, filters = {}) {
        try {
            const {
                limit = 20,
                offset = 0,
                status = null,
                provider = null,
                startDate = null,
                endDate = null,
                recipientPhone = null,
                messageContent = null,
                sortBy = 'created_at',
                sortOrder = -1,
                onlyFailed = false,
                onlyDelivered = false,
                onlyPending = false
            } = filters;

            const query = { username };

            // Status filters
            if (status) {
                query.delivery_status = status;
            } else if (onlyFailed) {
                query.delivery_status = { $in: ['failed', 'bounced'] };
            } else if (onlyDelivered) {
                query.delivery_status = 'delivered';
            } else if (onlyPending) {
                query.delivery_status = 'pending';
            }

            // Provider filter
            if (provider) query.provider_used = provider;

            // Date range filter
            if (startDate || endDate) {
                query.created_at = {};
                if (startDate) query.created_at.$gte = new Date(startDate);
                if (endDate) query.created_at.$lte = new Date(endDate);
            }

            // Recipient phone filter (exact or partial match)
            if (recipientPhone) {
                query.victim = { $regex: recipientPhone, $options: 'i' };
            }

            // Message content search (case-insensitive)
            if (messageContent) {
                query.message = { $regex: messageContent, $options: 'i' };
            }

            // Sort order validation
            const sortOrderNum = sortOrder === 'asc' || sortOrder === 1 ? 1 : -1;

            const total = await Log.countDocuments(query);
            const logs = await Log.find(query)
                .sort({ [sortBy]: sortOrderNum })
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
            throw new Error(`Failed to get advanced SMS history: ${error.message}`);
        }
    }

    /**
     * Get SMS history summary statistics
     * @param {string} username - Username
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Summary statistics
     */
    static async getSmsHistorySummary(username, filters = {}) {
        try {
            const {
                startDate = null,
                endDate = null,
                provider = null
            } = filters;

            const match = { $match: { username } };

            // Add filters to match stage
            if (provider) match.$match.provider_used = provider;
            if (startDate || endDate) {
                match.$match.created_at = {};
                if (startDate) match.$match.created_at.$gte = new Date(startDate);
                if (endDate) match.$match.created_at.$lte = new Date(endDate);
            }

            const summary = await Log.aggregate([
                match,
                {
                    $facet: {
                        byStatus: [
                            {
                                $group: {
                                    _id: '$delivery_status',
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { count: -1 } }
                        ],
                        byProvider: [
                            {
                                $group: {
                                    _id: '$provider_used',
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { count: -1 } }
                        ],
                        dailyStats: [
                            {
                                $group: {
                                    _id: {
                                        $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
                                    },
                                    count: { $sum: 1 },
                                    delivered: {
                                        $sum: { $cond: [{ $eq: ['$delivery_status', 'delivered'] }, 1, 0] }
                                    },
                                    failed: {
                                        $sum: { $cond: [{ $eq: ['$delivery_status', 'failed'] }, 1, 0] }
                                    }
                                }
                            },
                            { $sort: { _id: -1 } }
                        ]
                    }
                }
            ]);

            return summary[0] || {
                byStatus: [],
                byProvider: [],
                dailyStats: []
            };
        } catch (error) {
            throw new Error(`Failed to get SMS history summary: ${error.message}`);
        }
    }

    /**
     * Get delivery statistics for a user
     * @param {string} username - Username
     * @param {Object} options - Filter options (startDate, endDate)
     * @returns {Promise<Object>} Statistics
     */
    static async getDeliveryStats(username, options = {}) {
        try {
            const match = { $match: { username } };

            // Add date range if provided
            if (options.startDate || options.endDate) {
                match.$match.created_at = {};
                if (options.startDate) match.$match.created_at.$gte = new Date(options.startDate);
                if (options.endDate) match.$match.created_at.$lte = new Date(options.endDate);
            }

            const stats = await Log.aggregate([
                match,
                {
                    $group: {
                        _id: null,
                        total_sent: { $sum: 1 },
                        total_delivered: {
                            $sum: { $cond: [{ $eq: ['$delivery_status', 'delivered'] }, 1, 0] }
                        },
                        total_failed: {
                            $sum: { $cond: [{ $eq: ['$delivery_status', 'failed'] }, 1, 0] }
                        },
                        total_pending: {
                            $sum: { $cond: [{ $eq: ['$delivery_status', 'pending'] }, 1, 0] }
                        },
                        total_bounced: {
                            $sum: { $cond: [{ $eq: ['$delivery_status', 'bounced'] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        total_sent: 1,
                        total_delivered: 1,
                        total_failed: 1,
                        total_pending: 1,
                        total_bounced: 1,
                        delivery_rate: {
                            $multiply: [
                                { $divide: ['$total_delivered', '$total_sent'] },
                                100
                            ]
                        },
                        failure_rate: {
                            $multiply: [
                                { $divide: ['$total_failed', '$total_sent'] },
                                100
                            ]
                        }
                    }
                }
            ]);

            return stats[0] || {
                total_sent: 0,
                total_delivered: 0,
                total_failed: 0,
                total_pending: 0,
                total_bounced: 0,
                delivery_rate: 0,
                failure_rate: 0
            };
        } catch (error) {
            throw new Error(`Failed to get delivery stats: ${error.message}`);
        }
    }

    /**
     * Bulk update delivery status from provider webhooks
     * @param {Array} updates - Array of update objects
     * @returns {Promise<Object>} Update results
     */
    static async bulkUpdateDeliveryStatus(updates) {
        try {
            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const update of updates) {
                try {
                    await this.updateDeliveryStatus(update.logId, update.status, update.options);
                    results.successful++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        logId: update.logId,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Bulk update failed: ${error.message}`);
        }
    }
}

module.exports = DeliveryStatusService;
