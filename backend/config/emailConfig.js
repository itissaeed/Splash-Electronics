const nodemailer = require('nodemailer');

// For development - using Ethereal (fake SMTP service)
const createTransporter = async () => {
    const testAccount = await nodemailer.createTestAccount();
    
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
};

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
    const transporter = await createTransporter();

    // Define resetURL before using it
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const info = await transporter.sendMail({
        from: '"Splash Electronics" <noreply@splashelectronics.com>',
        to: email,
        subject: 'Password Reset',
        html: `
            <h2>Reset Your Password</h2>
            <p>Copy the URL below and paste it into your browser to reset your password:</p>
            <p style="background:#f0f0f0; padding:10px; border-radius:5px; word-break:break-all;">
                ${resetURL}
            </p>
            <p>Reset Token (for testing): <strong>${resetToken}</strong></p>
            <p>This link will expire in 10 minutes.</p>
        `
    });

    // Log token and preview URL
    console.log('Reset Token:', resetToken);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('Reset link (dev copy-paste):', resetURL);

    return info;
};

module.exports = { sendPasswordResetEmail };
