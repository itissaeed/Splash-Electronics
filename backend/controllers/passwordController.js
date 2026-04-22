// controllers/passwordController.js
const User = require("../models/UserModel");
const crypto = require("crypto");
const { sendPasswordResetOtpEmail } = require("../config/emailConfig");

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp).trim()).digest("hex");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "fail", message: "Please provide an email address" });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "If that email exists, a password reset code has been sent.",
      });
    }

    const resetOtp = user.createPasswordResetOtp();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetOtpEmail(user.email, resetOtp);
      return res.status(200).json({
        status: "success",
        requiresOtp: true,
        email: cleanEmail,
        message: "If that email exists, a password reset code has been sent.",
      });
    } catch (err) {
      user.clearPasswordReset();
      await user.save({ validateBeforeSave: false });

      console.error("Email Error:", err);
      return res.status(500).json({
        status: "error",
        message: "There was an error sending the email. Try again later.",
      });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ status: "error", message: "Something went wrong!" });
  }
};

exports.resendPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "fail", message: "Please provide an email address" });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "If that email exists, a password reset code has been sent.",
      });
    }

    const resetOtp = user.createPasswordResetOtp();
    await user.save({ validateBeforeSave: false });
    await sendPasswordResetOtpEmail(user.email, resetOtp);

    return res.status(200).json({
      status: "success",
      email: cleanEmail,
      message: "A new password reset code has been sent.",
    });
  } catch (error) {
    console.error("Resend Password Reset OTP Error:", error);
    return res.status(500).json({ status: "error", message: "Failed to resend password reset code." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, email, otp, password } = req.body;

    if (!password || (!token && (!email || !otp))) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide the required reset details and a new password",
      });
    }

    let user = null;

    if (token) {
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
    } else {
      const cleanEmail = String(email).toLowerCase().trim();
      user = await User.findOne({
        email: cleanEmail,
        resetPasswordToken: hashOtp(otp),
        resetPasswordExpires: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({ status: "fail", message: "Reset code is invalid or has expired" });
    }

    user.password = password;
    user.clearPasswordReset();

    await user.save();

    return res.status(200).json({ status: "success", message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ status: "error", message: "Something went wrong!" });
  }
};
