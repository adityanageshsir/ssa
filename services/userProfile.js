/**
 * User Profile Service
 * Handles user profile updates and validation
 */

const bcrypt = require('bcryptjs');
const User = require('../model/User');

class UserProfileService {
    /**
     * Update user profile (name and email)
     * @param {string} userId - User's MongoDB ID
     * @param {Object} data - Data to update
     * @param {string} data.name - New name
     * @param {string} data.email - New email
     * @returns {Promise<Object>} Updated user
     */
    static async updateProfile(userId, data) {
        try {
            const { name, email } = data;
            const updateData = {};

            // Validate name
            if (name) {
                if (name.trim().length < 2) {
                    throw new Error('Name must be at least 2 characters long');
                }
                if (name.trim().length > 100) {
                    throw new Error('Name must not exceed 100 characters');
                }
                updateData.name = name.trim();
            }

            // Validate and check email uniqueness
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    throw new Error('Invalid email format');
                }

                // Check if email is already in use by another user
                const existingUser = await User.findOne({
                    email: email.toLowerCase(),
                    _id: { $ne: userId }
                });

                if (existingUser) {
                    throw new Error('Email is already in use');
                }

                updateData.email = email.toLowerCase();
            }

            // Update user
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                throw new Error('User not found');
            }

            return this._sanitizeUser(updatedUser);
        } catch (error) {
            throw new Error(`Profile update failed: ${error.message}`);
        }
    }

    /**
     * Change user password
     * @param {string} userId - User's MongoDB ID
     * @param {Object} data - Password data
     * @param {string} data.currentPassword - Current password for verification
     * @param {string} data.newPassword - New password
     * @param {string} data.confirmPassword - Password confirmation
     * @returns {Promise<Object>} Success message with user info
     */
    static async changePassword(userId, data) {
        try {
            const { currentPassword, newPassword, confirmPassword } = data;

            // Validate input
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new Error('All password fields are required');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }

            if (newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            if (newPassword.length > 50) {
                throw new Error('Password must not exceed 50 characters');
            }

            // Prevent same password
            if (currentPassword === newPassword) {
                throw new Error('New password must be different from current password');
            }

            // Get user with password field
            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            user.password = hashedPassword;
            await user.save();

            return {
                success: true,
                msg: 'Password changed successfully',
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    name: user.name
                }
            };
        } catch (error) {
            throw new Error(`Password change failed: ${error.message}`);
        }
    }

    /**
     * Get user profile
     * @param {string} userId - User's MongoDB ID
     * @returns {Promise<Object>} User profile
     */
    static async getProfile(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            return this._sanitizeUser(user);
        } catch (error) {
            throw new Error(`Failed to get profile: ${error.message}`);
        }
    }

    /**
     * Delete user account
     * @param {string} userId - User's MongoDB ID
     * @param {string} password - User's password for confirmation
     * @returns {Promise<Object>} Success message
     */
    static async deleteAccount(userId, password) {
        try {
            if (!password) {
                throw new Error('Password is required for account deletion');
            }

            // Get user with password field
            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new Error('User not found');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Password is incorrect');
            }

            // Delete user
            await User.findByIdAndDelete(userId);

            return {
                success: true,
                msg: 'Account deleted successfully'
            };
        } catch (error) {
            throw new Error(`Account deletion failed: ${error.message}`);
        }
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
    static validatePasswordStrength(password) {
        const result = {
            isValid: true,
            score: 0,
            issues: []
        };

        if (password.length < 6) {
            result.issues.push('At least 6 characters required');
        } else {
            result.score += 20;
        }

        if (password.length >= 12) {
            result.score += 20;
        }

        if (/[a-z]/.test(password)) {
            result.score += 15;
        } else {
            result.issues.push('Include lowercase letters');
        }

        if (/[A-Z]/.test(password)) {
            result.score += 15;
        } else {
            result.issues.push('Include uppercase letters');
        }

        if (/[0-9]/.test(password)) {
            result.score += 15;
        } else {
            result.issues.push('Include numbers');
        }

        if (/[^a-zA-Z0-9]/.test(password)) {
            result.score += 15;
        } else {
            result.issues.push('Include special characters');
        }

        result.isValid = result.issues.length === 0;
        result.strength = result.score >= 70 ? 'strong' : result.score >= 40 ? 'medium' : 'weak';

        return result;
    }

    /**
     * Remove sensitive data from user object
     * @private
     * @param {Object} user - User document
     * @returns {Object} Sanitized user
     */
    static _sanitizeUser(user) {
        const userObj = user.toObject ? user.toObject() : user;
        delete userObj.password;
        return {
            _id: userObj._id,
            username: userObj.username,
            email: userObj.email,
            name: userObj.name,
            date: userObj.date
        };
    }
}

module.exports = UserProfileService;
