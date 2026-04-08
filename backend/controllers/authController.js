// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { normalizeBangladeshNumber } = require("../utils/numberNormalizer");

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

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

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { number: normalizedNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        status: "fail",
        message: "User with this email or phone number already exists.",
      });
    }

    const newUser = new User({
      name: String(name).trim(),
      email: cleanEmail,
      number: normalizedNumber,
      password,
    });

    await newUser.save();

    const token = signToken(newUser._id);

    const userObj = newUser.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    delete userObj.__v;

    return res.status(201).json({ status: "success", token, user: userObj });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ status: "fail", message: "Email or phone already in use." });
    }
    console.error("Signup Error:", error);
    return res.status(500).json({ status: "error", message: "Signup failed." });
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

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ status: "fail", message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    delete userObj.__v;

    return res.status(200).json({
      status: "success",
      token,
      user: userObj,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ status: "error", message: "An error occurred during login" });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Not authorized" });
    }
    return res.status(200).json({ status: "success", user: req.user });
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

    const userObj = currentUser.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    delete userObj.__v;

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully.",
      user: userObj,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ status: "fail", message: "Email or phone already in use." });
    }
    console.error("updateMe Error:", error);
    return res.status(500).json({ status: "error", message: "Failed to update profile." });
  }
};
