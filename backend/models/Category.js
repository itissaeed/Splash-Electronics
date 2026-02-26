// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null }, // phones -> android
  attributes: [{ type: String }], // e.g. ["ram", "storage", "screen", "chipset"]
  // Optional defaults used by admin product form when this category is selected.
  highlightsTemplate: [{ type: String, trim: true }],
  specsTemplate: { type: Map, of: String, default: {} },
}, { timestamps: true });


module.exports = mongoose.model("Category", categorySchema);
