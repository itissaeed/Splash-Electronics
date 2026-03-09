const mongoose = require("mongoose");

const productViewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  visitorKey: { type: String, required: true, index: true },
  viewedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

productViewSchema.index({ product: 1, viewedAt: -1 });
productViewSchema.index({ visitorKey: 1, viewedAt: -1 });

module.exports = mongoose.model("ProductView", productViewSchema);
