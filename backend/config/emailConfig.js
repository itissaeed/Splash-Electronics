const nodemailer = require('nodemailer');

// For development - using Ethereal (fake SMTP service)
const createTransporter = async () => {
    // Generate test account for development
    const testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });

    return transporter;
};

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
        from: '"Splash Electronics" <noreply@splashelectronics.com>',
        to: email,
        subject: 'Password Reset',
        html: `
            <h2>Reset Your Password</h2>
            <p>Click the link below to reset your password:</p>
            <p>Reset Token (for testing): ${resetToken}</p>
            <a href="${process.env.FRONTEND_URL}/reset-password/${resetToken}">
                Reset Password
            </a>
            <p>This link will expire in 10 minutes.</p>
        `
    });

    // Log token directly to console for testing
    console.log('Reset Token:', resetToken);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return info;
};

module.exports = { sendPasswordResetEmail };