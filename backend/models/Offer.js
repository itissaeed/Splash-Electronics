const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["PERCENT", "FIXED_AMOUNT"], required: true },
    value: { type: Number, required: true, min: 0 },
    priority: { type: Number, default: 0 },
    scopeType: {
      type: String,
      enum: ["ALL", "PRODUCTS", "CATEGORIES"],
      default: "ALL",
    },
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    validFrom: Date,
    validTo: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
