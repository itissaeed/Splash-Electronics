// models/ReturnRefund.js
const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  qty: { type: Number, required: true },
  reason: { type: String, required: true }, // damaged/wrong item
}, { _id: true });

const returnRefundSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  items: [returnItemSchema],
  status: { type: String, enum: ["requested", "approved", "rejected", "picked", "received", "refunded"], default: "requested" },

  refund: {
    amount: Number,
    method: { type: String, enum: ["BKASH", "NAGAD", "BANK", "CARD", "CASH"] },
    transactionId: String,
    refundedAt: Date,
  },

  notes: String,
}, { timestamps: true });

module.exports = mongoose.model("ReturnRefund", returnRefundSchema);
