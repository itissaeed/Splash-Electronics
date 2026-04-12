// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { normalizeBangladeshNumber, VALIDATION_ERROR } = require("../utils/numberNormalizer");

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },
  recipientName: { type: String, required: true },
  phone: { type: String, required: true },
  division: { type: String, required: true },
  district: { type: String, required: true },
  upazila: { type: String },
  area: { type: String },
  postalCode: { type: String },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },

  number: { type: String },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String, trim: true },
  emailVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  roles: { type: [String], default: ["customer"] },

  addresses: [addressSchema],

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  isBlocked: { type: Boolean, default: false },
  lastLoginAt: { type: Date },

  resetPasswordToken: String,
  resetPasswordExpires: Date,
  signupOtpHash: String,
  signupOtpExpires: Date,
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("number")) {
      if (!this.number) {
        this.number = undefined;
      }
    }
    if (this.isModified("number") && this.number) {
      const normalized = normalizeBangladeshNumber(this.number);
      if (!normalized) return next(new Error(VALIDATION_ERROR));
      this.number = normalized;
    }
    if (!this.isModified("password")) return next();
    if (!this.password) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (e) {
    next(e);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiryMinutes = Number(process.env.RESET_PASSWORD_EXPIRES_MINUTES || 30);
  this.resetPasswordExpires = Date.now() + expiryMinutes * 60 * 1000;
  return resetToken;
};

userSchema.methods.createSignupOtp = function () {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiryMinutes = Number(process.env.SIGNUP_OTP_EXPIRES_MINUTES || 15);
  this.signupOtpHash = crypto.createHash("sha256").update(otp).digest("hex");
  this.signupOtpExpires = Date.now() + expiryMinutes * 60 * 1000;
  return otp;
};

userSchema.methods.clearSignupOtp = function () {
  this.signupOtpHash = undefined;
  this.signupOtpExpires = undefined;
};

userSchema.index({ number: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
