// controllers/passwordController.js
const User = require("../models/userModel");
const { sendPasswordResetEmail } = require("../config/emailConfig");

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
        message: "If that email exists, a password reset link has been sent.",
      });
    }

    // Use your model method (recommended)
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
      return res.status(200).json({ status: "success", message: "Reset link sent to email" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
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

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide both token and new password",
      });
    }

    // token is raw; DB stored hashed token
    const crypto = require("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ status: "fail", message: "Token is invalid or has expired" });
    }

    user.password = password; // pre-save hook hashes
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({ status: "success", message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ status: "error", message: "Something went wrong!" });
  }
};
