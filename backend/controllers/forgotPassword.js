const User = require('../models/userModel');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../config/emailConfig');

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide an email address'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                status: 'success',
                message: 'If that email exists, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save({ validateBeforeSave: false });

        try {
            await sendPasswordResetEmail(user.email, resetToken);
            
            res.status(200).json({
                status: 'success',
                message: 'Reset link sent to email'
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            
            console.error('Email Error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'There was an error sending the email. Try again later.'
            });
        }
    } catch (error) {
        console.error('Forgot Password Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong!'
        });
    }
};