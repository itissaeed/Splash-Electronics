const User = require('../models/userModel');
const crypto = require('crypto');

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Debug logs
        console.log('Reset attempt with token:', token);

        if (!token || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide both token and new password'
            });
        }

        // Hash the token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        
        console.log('Looking for user with hashed token:', hashedToken);

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        console.log('User found:', !!user);
        if (user) {
            console.log('Token expiry:', user.resetPasswordExpires);
            console.log('Current time:', Date.now());
        }

        if (!user) {
            return res.status(400).json({
                status: 'fail',
                message: 'Token is invalid or has expired'
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({
            status: 'success',
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        console.error('Full error stack:', error.stack);
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong!'
        });
    }
};