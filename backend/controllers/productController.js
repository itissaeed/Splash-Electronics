// controllers/productController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");

const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// helper: safe number parsing
const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
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
      const brandDoc = await Brand.findOne({ $or: [{ _id: brandVal }, { slug: brandVal }] }).select("_id");
      if (brandDoc) filter.brand = brandDoc._id;
    }

    // category filter (accept categoryId or categorySlug)
    if (req.query.category) {
      const catVal = String(req.query.category).trim();
      const catDoc = await Category.findOne({ $or: [{ _id: catVal }, { slug: catVal }] }).select("_id");
      if (catDoc) filter.category = catDoc._id;
    }

    // price filter (works on basePrice OR variants.price)
    const minPrice = req.query.minPrice ? toNum(req.query.minPrice, 0) : null;
    const maxPrice = req.query.maxPrice ? toNum(req.query.maxPrice, 0) : null;

    if (minPrice !== null || maxPrice !== null) {
      const priceCond = {};
      if (minPrice !== null) priceCond.$gte = minPrice;
      if (maxPrice !== null) priceCond.$lte = maxPrice;

      filter.$or = [
        { basePrice: priceCond },
        { "variants.price": priceCond },
      ];
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

    // If you want to hide inactive products from public:
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
      return res.status(400).json({ message: "name, slug, brand, category, description are required" });
    }

    const exists = await Product.findOne({ slug: String(slug).toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Product slug already exists" });

    const product = await Product.create({
      name: String(name).trim(),
      slug: String(slug).toLowerCase().trim(),
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
    res.status(500).json({ message: "Failed to create product" });
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
    if (up.highlights !== undefined) product.highlights = Array.isArray(up.highlights) ? up.highlights : product.highlights;
    if (up.specs !== undefined) product.specs = up.specs || product.specs;
    if (up.warrantyMonths !== undefined) product.warrantyMonths = toNum(up.warrantyMonths, product.warrantyMonths);
    if (up.tags !== undefined) product.tags = Array.isArray(up.tags) ? up.tags : product.tags;

    if (up.isFeatured !== undefined) product.isFeatured = !!up.isFeatured;
    if (up.isActive !== undefined) product.isActive = !!up.isActive;

    // variants replace (simple approach)
    if (up.variants !== undefined) {
      product.variants = Array.isArray(up.variants) ? up.variants : product.variants;
    }

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    console.error("updateProduct Error:", error);
    res.status(500).json({ message: "Failed to update product" });
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

// --- Admin: POST /api/admin/products/:id/images (upload to variant) ---
// query: ?variantId=xxxx   (required)
exports.uploadProductImage = async (req, res) => {
  try {
    const { variantId } = req.query;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!variantId) return res.status(400).json({ message: "variantId is required in query" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const uploadFromBuffer = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => (result ? resolve(result) : reject(error))
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });

    const result = await uploadFromBuffer(req.file.buffer);

    variant.images.push({ url: result.secure_url, public_id: result.public_id });
    await product.save();

    res.status(201).json({ message: "Image uploaded", image: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error("uploadProductImage Error:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
};

// --- Admin: DELETE /api/admin/products/:id/images ---
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

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("deleteProductImage Error:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};
