// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  nameSnapshot: { type: String, required: true },
  skuSnapshot: { type: String, required: true },
  imageSnapshot: { type: String },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }, // unit price at purchase
}, { _id: true });

const shippingAddressSchema = new mongoose.Schema({
  recipientName: String,
  phone: String,
  division: { type: String, required: true },
  district: { type: String, required: true },
  upazila: String,
  area: String,
  postalCode: String,
  addressLine1: { type: String, required: true },
  addressLine2: String,
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ["COD", "BKASH", "NAGAD", "CARD", "BANK"], required: true },
  status: { type: String, enum: ["unpaid", "paid", "failed", "refunded", "partial_refund"], default: "unpaid" },
  provider: { type: String }, // bKash/nagad/sslcommerz/stripe
  transactionId: String,
  paidAt: Date,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true }, // readable order code
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  items: [orderItemSchema],

  shippingAddress: shippingAddressSchema,

  payment: paymentSchema,

  pricing: {
    itemsTotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true, default: 0 },
    discountTotal: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true },
  },

  coupon: {
    code: String,
    discountAmount: Number,
  },

  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
    default: "pending",
  },

  shipment: {
    courier: String,         // Pathao/RedX/Sundarban
    trackingId: String,
    shippedAt: Date,
    deliveredAt: Date,
  },

  notes: String,
}, { timestamps: true });

orderSchema.index({ orderNo: 1 }, { unique: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
// Region analytics
orderSchema.index({ "shippingAddress.division": 1, "shippingAddress.district": 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
