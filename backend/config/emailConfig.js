const nodemailer = require("nodemailer");

let cachedTransporter = null;

// Create transporter once (Ethereal for dev)
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const testAccount = await nodemailer.createTestAccount();

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log("📧 Ethereal user:", testAccount.user);
  console.log("📧 Ethereal pass:", testAccount.pass);

  return cachedTransporter;
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = await getTransporter();

  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetURL = `${baseUrl}/reset-password/${resetToken}`;

  const info = await transporter.sendMail({
    from: '"Splash Electronics" <noreply@splashelectronics.com>',
    to: email,
    subject: "Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="margin:0 0 12px;">Reset your password</h2>
        <p>Click the button below to set a new password.</p>

        <p style="margin:16px 0;">
          <a href="${resetURL}" 
             style="display:inline-block; background:#4f46e5; color:#fff; padding:12px 16px; border-radius:10px; text-decoration:none; font-weight:600;">
            Reset Password
          </a>
        </p>

        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="background:#f3f4f6; padding:10px; border-radius:8px; word-break:break-all;">
          <a href="${resetURL}">${resetURL}</a>
        </p>

        <p style="color:#6b7280; font-size:12px;">
          This link will expire in 10 minutes. If you didn’t request this, ignore this email.
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <p style="color:#6b7280; font-size:12px;">
          Dev Token: <strong>${resetToken}</strong>
        </p>
      </div>
    `,
  });

  console.log("Reset Token:", resetToken);
  console.log("Reset link (dev):", resetURL);
  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

  return info;
};

module.exports = { sendPasswordResetEmail };
