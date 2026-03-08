// controllers/productController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const Order = require("../models/Order");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// helper: safe number parsing
const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// helper: upload buffer -> cloudinary
const uploadFromBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => (result ? resolve(result) : reject(error))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

// helper: validate unique SKU in variants (within this product)
const assertUniqueSkus = (variants = []) => {
  const seen = new Set();
  for (const v of variants) {
    const sku = String(v?.sku || "").trim();
    if (!sku) continue; // allow empty SKU (optional)
    const key = sku.toLowerCase();
    if (seen.has(key)) {
      const err = new Error(`Duplicate SKU found: ${sku}`);
      err.statusCode = 400;
      throw err;
    }
    seen.add(key);
  }
};

const roundToTenth = (value) => Math.round(value * 10) / 10;

const updateReviewMetrics = (product) => {
  const totalReviews = product.reviews.length;
  product.numReviews = totalReviews;

  if (!totalReviews) {
    product.rating = 0;
    return;
  }

  const totalRating = product.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  product.rating = roundToTenth(totalRating / totalReviews);
};

// --- Public: GET /api/products (pagination + filters) ---
exports.getProducts = async (req, res) => {
  try {
    const pageSize = toNum(req.query.limit, 10);
    const page = toNum(req.query.pageNumber, 1);

    const filter = { isActive: true };

    // text search
    if (req.query.keyword) {
      filter.$text = { $search: String(req.query.keyword) };
    }

    // featured
    if (req.query.featured === "true") {
      filter.isFeatured = true;
    }

    // brand filter (accept brandId or brandSlug)
    if (req.query.brand) {
      const brandVal = String(req.query.brand).trim();

      const or = [{ slug: brandVal }];
      if (mongoose.Types.ObjectId.isValid(brandVal)) {
        or.unshift({ _id: brandVal });
      }

      const brandDoc = await Brand.findOne({ $or: or }).select("_id");
      if (brandDoc) filter.brand = brandDoc._id;
    }

    // category filter (accept categoryId or categorySlug)
    if (req.query.category) {
      const catVal = String(req.query.category).trim();

      const or = [{ slug: catVal }];
      if (mongoose.Types.ObjectId.isValid(catVal)) {
        or.unshift({ _id: catVal });
      }

      const catDoc = await Category.findOne({ $or: or }).select("_id");
      if (catDoc) filter.category = catDoc._id;
    }

    // price filter (works on basePrice OR variants.price)
    const minPrice = req.query.minPrice ? toNum(req.query.minPrice, 0) : null;
    const maxPrice = req.query.maxPrice ? toNum(req.query.maxPrice, 0) : null;

    if (minPrice !== null || maxPrice !== null) {
      const priceCond = {};
      if (minPrice !== null) priceCond.$gte = minPrice;
      if (maxPrice !== null) priceCond.$lte = maxPrice;

      filter.$or = [{ basePrice: priceCond }, { "variants.price": priceCond }];
    }

    // sorting
    const sort = {};
    const sortBy = String(req.query.sort || "").trim();
    if (sortBy === "priceAsc") sort.basePrice = 1;
    else if (sortBy === "priceDesc") sort.basePrice = -1;
    else if (sortBy === "rating") sort.rating = -1;
    else sort.createdAt = -1;

    const count = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .populate("brand", "name slug")
      .sort(sort)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
  } catch (error) {
    console.error("getProducts Error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// Optional: GET /api/products/id/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug parent")
      .populate("brand", "name slug");

    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("getProductById Error:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// --- Public: GET /api/products/:slug ---
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate("category", "name slug parent")
      .populate("brand", "name slug");

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    console.error("getProductBySlug Error:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// --- Admin: GET /api/admin/products ---
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("category", "name slug")
      .populate("brand", "name slug")
      .sort({ createdAt: -1 });

    res.json({ products });
  } catch (error) {
    console.error("getAllProductsAdmin Error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// --- Admin: POST /api/admin/products ---
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      brand,
      category,
      description,
      basePrice,
      highlights,
      specs,
      warrantyMonths,
      tags,
      isFeatured,
      variants, // [{sku, attributes:{color,ram,storage}, price, countInStock, isDefault}]
    } = req.body;

    if (!name || !slug || !brand || !category || !description) {
      return res.status(400).json({
        message: "name, slug, brand, category, description are required",
      });
    }

    const normalizedSlug = String(slug).toLowerCase().trim();

    const exists = await Product.findOne({ slug: normalizedSlug });
    if (exists) return res.status(409).json({ message: "Product slug already exists" });

    // ✅ SKU uniqueness inside this product
    if (Array.isArray(variants)) assertUniqueSkus(variants);

    const product = await Product.create({
      name: String(name).trim(),
      slug: normalizedSlug,
      brand,
      category,
      description,
      basePrice: toNum(basePrice, 0),
      highlights: Array.isArray(highlights) ? highlights : [],
      specs: specs || {},
      warrantyMonths: toNum(warrantyMonths, 0),
      tags: Array.isArray(tags) ? tags : [],
      isFeatured: !!isFeatured,
      variants: Array.isArray(variants) ? variants : [],
      rating: 0,
      numReviews: 0,
      isActive: true,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("createProduct Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create product",
    });
  }
};

// --- Admin: PUT /api/admin/products/:id ---
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const up = req.body;

    if (up.name !== undefined) product.name = String(up.name).trim();
    if (up.slug !== undefined) product.slug = String(up.slug).toLowerCase().trim();
    if (up.brand !== undefined) product.brand = up.brand;
    if (up.category !== undefined) product.category = up.category;
    if (up.description !== undefined) product.description = up.description;

    if (up.basePrice !== undefined) product.basePrice = toNum(up.basePrice, product.basePrice);
    if (up.highlights !== undefined)
      product.highlights = Array.isArray(up.highlights) ? up.highlights : product.highlights;
    if (up.specs !== undefined) product.specs = up.specs || product.specs;
    if (up.warrantyMonths !== undefined)
      product.warrantyMonths = toNum(up.warrantyMonths, product.warrantyMonths);
    if (up.tags !== undefined) product.tags = Array.isArray(up.tags) ? up.tags : product.tags;

    if (up.isFeatured !== undefined) product.isFeatured = !!up.isFeatured;
    if (up.isActive !== undefined) product.isActive = !!up.isActive;

    // variants replace (simple approach)
    if (up.variants !== undefined) {
      const nextVariants = Array.isArray(up.variants) ? up.variants : product.variants;
      // ✅ SKU uniqueness inside this product
      assertUniqueSkus(nextVariants);

      product.variants = nextVariants;
    }

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    console.error("updateProduct Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update product",
    });
  }
};

// --- Admin: DELETE /api/admin/products/:id ---
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    res.json({ message: "Product removed" });
  } catch (error) {
    console.error("deleteProduct Error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

// --- Public: GET /api/products/featured ---
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate("category", "name slug")
      .populate("brand", "name slug")
      .limit(8)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("getFeaturedProducts Error:", error);
    res.status(500).json({ message: "Failed to fetch featured products" });
  }
};

/**
 * ✅ Admin: POST /api/products/:id/images  (or /api/admin/products/:id/images — your choice)
 * query: ?variantId=xxxx   (required)
 *
 * Supports:
 * - single upload: req.file (multer.single("image"))
 * - multiple upload: req.files (multer.array("images") OR multer.array("image"))
 */
// --- Protected: POST /api/products/:id/reviews ---
exports.createProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }

    const rating = Number(req.body?.rating);
    const title = String(req.body?.title || "").trim();
    const comment = String(req.body?.comment || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    if (!comment) {
      return res.status(400).json({ message: "Comment is required" });
    }

    const verifiedPurchase = await Order.exists({
      user: req.user._id,
      status: "delivered",
      "items.product": product._id,
    });

    const existingReview = product.reviews.find(
      (review) => String(review.user) === String(req.user._id)
    );

    if (existingReview) {
      existingReview.name = req.user.name;
      existingReview.title = title;
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.verifiedPurchase = Boolean(verifiedPurchase);
    } else {
      product.reviews.push({
        name: req.user.name,
        title,
        rating,
        comment,
        verifiedPurchase: Boolean(verifiedPurchase),
        user: req.user._id,
      });
    }

    updateReviewMetrics(product);
    await product.save();

    const freshProduct = await Product.findById(product._id)
      .populate("category", "name slug parent")
      .populate("brand", "name slug");

    res.status(existingReview ? 200 : 201).json(freshProduct);
  } catch (error) {
    console.error("createProductReview Error:", error);
    res.status(500).json({ message: "Failed to submit review" });
  }
};

exports.uploadProductImage = async (req, res) => {
  try {
    const { variantId } = req.query;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!variantId) return res.status(400).json({ message: "variantId is required in query" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    // ✅ accept single or multiple
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files) && req.files.length) files.push(...req.files);

    if (!files.length) return res.status(400).json({ message: "No file uploaded" });

    const uploaded = [];

    for (const f of files) {
      const result = await uploadFromBuffer(f.buffer);
      variant.images.push({ url: result.secure_url, public_id: result.public_id });
      uploaded.push({ url: result.secure_url, public_id: result.public_id });
    }

    await product.save();

    res.status(201).json({
      message: "Image(s) uploaded",
      variantId,
      uploaded,
      images: variant.images, // ✅ return updated gallery for this variant
    });
  } catch (error) {
    console.error("uploadProductImage Error:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
};

// --- Admin: DELETE /api/products/:id/images ---
// body: { variantId, public_id }
exports.deleteProductImage = async (req, res) => {
  try {
    const { variantId, public_id } = req.body;

    if (!variantId || !public_id) {
      return res.status(400).json({ message: "variantId and public_id are required" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    await cloudinary.uploader.destroy(public_id);

    variant.images = variant.images.filter((img) => img.public_id !== public_id);
    await product.save();

    res.json({ message: "Image deleted successfully", variantId, images: variant.images });
  } catch (error) {
    console.error("deleteProductImage Error:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};
