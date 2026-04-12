const nodemailer = require("nodemailer");

let cachedTransporter = null;

const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return cachedTransporter;
  }

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

  console.log("Ethereal user:", testAccount.user);
  console.log("Ethereal pass:", testAccount.pass);

  return cachedTransporter;
};

const getFromAddress = () =>
  process.env.SMTP_FROM || '"Splash Electronics" <noreply@splashelectronics.com>';

const logPreview = (label, info, extra = {}) => {
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`${label} preview:`, previewUrl);
  }

  Object.entries(extra).forEach(([key, value]) => {
    if (value) {
      console.log(`${label} ${key}:`, value);
    }
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = await getTransporter();
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetURL = `${baseUrl}/reset-password/${resetToken}`;
  const expiryMinutes = Number(process.env.RESET_PASSWORD_EXPIRES_MINUTES || 30);

  const info = await transporter.sendMail({
    from: getFromAddress(),
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

        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p style="background:#f3f4f6; padding:10px; border-radius:8px; word-break:break-all;">
          <a href="${resetURL}">${resetURL}</a>
        </p>

        <p style="color:#6b7280; font-size:12px;">
          This link will expire in ${expiryMinutes} minutes. If you did not request this, ignore this email.
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <p style="color:#6b7280; font-size:12px;">
          Dev Token: <strong>${resetToken}</strong>
        </p>
      </div>
    `,
  });

  logPreview("Password reset", info, {
    token: resetToken,
    link: resetURL,
  });

  return info;
};

const sendSignupOtpEmail = async (email, otp, name) => {
  const transporter = await getTransporter();
  const expiryMinutes = Number(process.env.SIGNUP_OTP_EXPIRES_MINUTES || 15);

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: "Verify your Splash Electronics account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="margin:0 0 12px;">Verify your email</h2>
        <p>Hello ${name || "there"},</p>
        <p>Use the verification code below to complete your signup.</p>

        <div style="margin:18px 0; font-size:28px; letter-spacing:8px; font-weight:700; color:#111827;">
          ${otp}
        </div>

        <p style="color:#6b7280; font-size:12px;">
          This code expires in ${expiryMinutes} minutes. If you did not start signup, you can ignore this email.
        </p>
      </div>
    `,
  });

  logPreview("Signup OTP", info, {
    otp,
    email,
  });

  return info;
};

module.exports = { sendPasswordResetEmail, sendSignupOtpEmail };
