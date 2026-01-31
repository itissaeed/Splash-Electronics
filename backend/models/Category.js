// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null }, // phones -> android
  attributes: [{ type: String }], // e.g. ["ram", "storage", "screen", "chipset"]
}, { timestamps: true });

categorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
