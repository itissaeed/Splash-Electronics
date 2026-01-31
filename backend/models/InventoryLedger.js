// models/InventoryLedger.js
const mongoose = require("mongoose");

const inventoryLedgerSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },

  type: { type: String, enum: ["IN", "OUT", "ADJUST"], required: true },
  reason: { type: String, enum: ["PURCHASE", "SALE", "RETURN", "DAMAGE", "MANUAL", "CANCELLED_ORDER"], required: true },

  qty: { type: Number, required: true }, // positive number
  unitCost: { type: Number }, // for purchases
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  note: String,

  at: { type: Date, default: Date.now },
}, { timestamps: true });

inventoryLedgerSchema.index({ product: 1, variantId: 1, at: -1 });
inventoryLedgerSchema.index({ reason: 1, at: -1 });

module.exports = mongoose.model("InventoryLedger", inventoryLedgerSchema);
