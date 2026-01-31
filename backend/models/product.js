// models/Product.js
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
}, { _id: true });

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true }, // e.g. IP15PM-256-BLK
  attributes: {
    color: String,
    ram: String,      // "8GB"
    storage: String,  // "256GB"
    size: String,     // optional
  },
  price: { type: Number, required: true },
  countInStock: { type: Number, required: true, default: 0 },
  images: [imageSchema],
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },

  brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

  description: { type: String, required: true },
  highlights: [{ type: String }], // bullet points
  specs: { type: Map, of: String }, // flexible: { chipset: "A17", screen: "6.7" }

  basePrice: { type: Number, required: true, default: 0 }, // for listing; variants override
  variants: [variantSchema],

  warrantyMonths: { type: Number, default: 0 },
  tags: [{ type: String }],

  rating: { type: Number, required: true, default: 0 },
  numReviews: { type: Number, required: true, default: 0 },
  reviews: [reviewSchema],

  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // SEO
  metaTitle: String,
  metaDescription: String,
}, { timestamps: true });

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, brand: 1, isFeatured: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
