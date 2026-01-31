// models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ["PERCENT", "FIXED"], required: true },
  value: { type: Number, required: true }, // 10% or 200 tk
  minCartTotal: { type: Number, default: 0 },
  maxDiscount: { type: Number }, // for percent coupons

  validFrom: Date,
  validTo: Date,
  usageLimit: { type: Number, default: 0 }, // 0 => unlimited
  usedCount: { type: Number, default: 0 },

  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
