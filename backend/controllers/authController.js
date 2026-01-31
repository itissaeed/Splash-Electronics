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
