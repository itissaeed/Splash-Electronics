const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel");
const { sendSignupOtpEmail } = require("../config/emailConfig");
const { normalizeBangladeshNumber } = require("../utils/numberNormalizer");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const sanitizeUser = (userDoc) => {
  const userObj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  delete userObj.signupOtpHash;
  delete userObj.signupOtpExpires;
  delete userObj.__v;
  return userObj;
};

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

exports.signup = async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    if (!name || !email || !number || !password) {
      return res.status(400).json({
        status: "fail",
        message: "All fields (name, email, number, password) are required.",
      });
    }

    const normalizedNumber = normalizeBangladeshNumber(number);
    if (!normalizedNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid Bangladeshi phone number format.",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const trimmedName = String(name).trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    const duplicateNumberUser = await User.findOne({
      number: normalizedNumber,
      ...(existingUser?._id ? { _id: { $ne: existingUser._id } } : {}),
    });

    if (duplicateNumberUser) {
      return res.status(409).json({
        status: "fail",
        message: "User with this phone number already exists.",
      });
    }

    if (existingUser && existingUser.emailVerified) {
      return res.status(409).json({
        status: "fail",
        message: "User with this email already exists.",
      });
    }

    if (existingUser && existingUser.googleId && existingUser.email === cleanEmail) {
      return res.status(409).json({
        status: "fail",
        message: "This email already uses Google sign-in. Please continue with Google.",
      });
    }

    const user = existingUser || new User();
    user.name = trimmedName;
    user.email = cleanEmail;
    user.number = normalizedNumber;
    user.password = password;
    user.authProvider = "local";
    user.emailVerified = false;
    user.avatar = user.avatar || undefined;

    const otp = user.createSignupOtp();
    await user.save();
    await sendSignupOtpEmail(user.email, otp, user.name);

    return res.status(existingUser ? 200 : 201).json({
      status: "success",
      requiresOtp: true,
      message: "Signup started. We sent a verification code to your email.",
      email: cleanEmail,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ status: "fail", message: "Email or phone already in use." });
    }
    console.error("Signup Error:", error);
    return res.status(500).json({ status: "error", message: "Signup failed." });
  }
};

exports.verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: "fail",
        message: "Email and verification code are required.",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail, emailVerified: false });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "No pending signup found for this email.",
      });
    }

    if (!user.signupOtpHash || !user.signupOtpExpires || user.signupOtpExpires.getTime() <= Date.now()) {
      return res.status(400).json({
        status: "fail",
        message: "The verification code is invalid or has expired.",
      });
    }

    if (user.signupOtpHash !== hashOtp(String(otp).trim())) {
      return res.status(400).json({
        status: "fail",
        message: "The verification code is invalid or has expired.",
      });
    }

    user.emailVerified = true;
    user.clearSignupOtp();
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    return res.status(200).json({
      status: "success",
      token,
      user: sanitizeUser(user),
      message: "Your account has been verified.",
    });
  } catch (error) {
    console.error("Verify Signup OTP Error:", error);
    return res.status(500).json({ status: "error", message: "Failed to verify signup OTP." });
  }
};

exports.resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "fail", message: "Please provide an email address." });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail, emailVerified: false });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "No pending signup found for this email.",
      });
    }

    const otp = user.createSignupOtp();
    await user.save({ validateBeforeSave: false });
    await sendSignupOtpEmail(user.email, otp, user.name);

    return res.status(200).json({
      status: "success",
      message: "A new verification code has been sent.",
    });
  } catch (error) {
    console.error("Resend Signup OTP Error:", error);
    return res.status(500).json({ status: "error", message: "Failed to resend verification code." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Email and password are required",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ status: "fail", message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ status: "fail", message: "Your account is blocked." });
    }

    if (!user.password) {
      return res.status(400).json({
        status: "fail",
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        status: "fail",
        requiresVerification: true,
        email: cleanEmail,
        message: "Please verify your email with the OTP we sent before logging in.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ status: "fail", message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    return res.status(200).json({
      status: "success",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ status: "error", message: "An error occurred during login" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ status: "fail", message: "Google credential is required." });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        status: "error",
        message: "GOOGLE_CLIENT_ID is not configured on the server.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = String(payload?.email || "").toLowerCase().trim();

    if (!payload?.sub || !email || !payload.email_verified) {
      return res.status(401).json({
        status: "fail",
        message: "Google account could not be verified.",
      });
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email }],
    });

    if (user?.isBlocked) {
      return res.status(403).json({ status: "fail", message: "Your account is blocked." });
    }

    if (!user) {
      user = new User({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        avatar: payload.picture || undefined,
        authProvider: "google",
        emailVerified: true,
        lastLoginAt: new Date(),
      });
      await user.save();
    } else {
      user.googleId = payload.sub;
      user.avatar = payload.picture || user.avatar;
      user.emailVerified = true;
      user.lastLoginAt = new Date();

      if (!user.password) {
        user.authProvider = "google";
      }

      await user.save({ validateBeforeSave: false });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      status: "success",
      token,
      user: sanitizeUser(user),
      profileIncomplete: !user.number,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(401).json({
      status: "fail",
      message: "Google sign-in failed.",
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Not authorized" });
    }
    return res.status(200).json({ status: "success", user: sanitizeUser(req.user) });
  } catch (error) {
    console.error("getMe Error:", error);
    return res.status(500).json({ status: "error", message: "Failed to load profile" });
  }
};

exports.updateMe = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ status: "fail", message: "Not authorized" });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    const nextName = req.body?.name !== undefined ? String(req.body.name || "").trim() : currentUser.name;
    const nextEmailRaw = req.body?.email !== undefined ? String(req.body.email || "").trim().toLowerCase() : currentUser.email;
    const nextNumberRaw = req.body?.number !== undefined ? String(req.body.number || "").trim() : currentUser.number;

    if (!nextName || !nextEmailRaw || !nextNumberRaw) {
      return res.status(400).json({
        status: "fail",
        message: "Name, email and phone are required.",
      });
    }

    const normalizedNumber = normalizeBangladeshNumber(nextNumberRaw);
    if (!normalizedNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid Bangladeshi phone number format.",
      });
    }

    const duplicateUser = await User.findOne({
      _id: { $ne: currentUser._id },
      $or: [{ email: nextEmailRaw }, { number: normalizedNumber }],
    });
    if (duplicateUser) {
      return res.status(409).json({
        status: "fail",
        message: "Email or phone already in use.",
      });
    }

    currentUser.name = nextName;
    currentUser.email = nextEmailRaw;
    currentUser.number = normalizedNumber;
    await currentUser.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully.",
      user: sanitizeUser(currentUser),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ status: "fail", message: "Email or phone already in use." });
    }
    console.error("updateMe Error:", error);
    return res.status(500).json({ status: "error", message: "Failed to update profile." });
  }
};
