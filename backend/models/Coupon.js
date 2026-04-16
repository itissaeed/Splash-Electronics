// models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, trim: true, default: "" },
  type: { type: String, enum: ["PERCENT", "FIXED", "FLAT"], required: true },
  value: { type: Number, required: true }, // 10% or 200 tk
  minCartTotal: { type: Number, default: 0 },
  maxDiscount: { type: Number }, // for percent coupons

  validFrom: Date,
  validTo: Date,
  usageLimit: { type: Number, default: 0 }, // 0 => unlimited
  perCustomerUsageLimit: { type: Number, default: 0 }, // 0 => unlimited
  usedCount: { type: Number, default: 0 },

  customerEligibility: {
    type: String,
    enum: ["ALL", "SPECIFIC_USERS", "NEW_CUSTOMERS", "RETURNING_CUSTOMERS"],
    default: "ALL",
  },
  discountAppliesTo: {
    type: String,
    enum: ["ELIGIBLE_ITEMS", "ENTIRE_CART"],
    default: "ELIGIBLE_ITEMS",
  },
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  applicableUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
