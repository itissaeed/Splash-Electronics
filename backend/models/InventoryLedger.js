// models/InventoryLedger.js
const mongoose = require("mongoose");

const inventoryLedgerSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sku: { type: String, default: "" },

  type: { type: String, enum: ["IN", "OUT", "ADJUST", "RESERVE", "RELEASE"], required: true },
  reason: {
    type: String,
    enum: [
      "PURCHASE",
      "RETURN",
      "DAMAGE",
      "MANUAL",
      "MANUAL_ADJUST",
      "ORDER_PLACED_RESERVE",
      "ORDER_CANCELLED_RELEASE",
      "PAYMENT_TIMEOUT_RELEASE",
      "PAYMENT_FAILED_RELEASE",
      "PAYMENT_CANCELLED_RELEASE",
      "FULFILLMENT_SHIPPED",
      "CANCELLED_ORDER_RESTOCK",
    ],
    required: true,
  },

  qty: { type: Number, required: true }, // positive number
  deltaQty: { type: Number, default: 0 },
  oldOnHand: { type: Number, default: 0 },
  newOnHand: { type: Number, default: 0 },
  oldReserved: { type: Number, default: 0 },
  newReserved: { type: Number, default: 0 },
  oldAvailable: { type: Number, default: 0 },
  newAvailable: { type: Number, default: 0 },
  unitCost: { type: Number }, // for purchases
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  note: String,

  at: { type: Date, default: Date.now },
}, { timestamps: true });

inventoryLedgerSchema.index({ product: 1, variantId: 1, at: -1 });
inventoryLedgerSchema.index({ reason: 1, at: -1 });

module.exports = mongoose.model("InventoryLedger", inventoryLedgerSchema);
