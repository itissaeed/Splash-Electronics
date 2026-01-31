// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { normalizeBangladeshNumber, VALIDATION_ERROR } = require("../utils/numberNormalizer");

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },     // Home/Office
  recipientName: { type: String, required: true },
  phone: { type: String, required: true },
  division: { type: String, required: true },  // Dhaka, Chattogram...
  district: { type: String, required: true },
  upazila: { type: String },
  area: { type: String },                      // locality
  postalCode: { type: String },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },

  number: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }, // keep if you want
  roles: { type: [String], default: ["customer"] }, // customer/admin/manager/support

  addresses: [addressSchema],

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  isBlocked: { type: Boolean, default: false },
  lastLoginAt: { type: Date },

  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("number")) {
      const normalized = normalizeBangladeshNumber(this.number);
      if (!normalized) return next(new Error(VALIDATION_ERROR));
      this.number = normalized;
    }
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (e) { next(e); }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  return resetToken;
};

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ number: 1 });

module.exports = mongoose.model("User", userSchema);
