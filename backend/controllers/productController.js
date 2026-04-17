// controllers/productController.js
const Product = require("../models/Product");
const ProductView = require("../models/ProductView");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const Order = require("../models/Order");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { getVisitorKey } = require("../utils/visitorKey");
const { enrichProductsWithInventory } = require("../services/stockReservationService");
const { applyOfferPricingToProducts } = require("../services/offerPricingService");

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

// helper: keep basePrice consistent with variant pricing
const computeBasePrice = (basePrice, variants = []) => {
  const prices = (Array.isArray(variants) ? variants : [])
    .map((v) => Number(v?.price))
    .filter((v) => Number.isFinite(v) && v >= 0);

  if (prices.length) return Math.min(...prices);

  const n = Number(basePrice);
  return Number.isFinite(n) ? n : 0;
};

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
const PUBLICATION_STATUSES = new Set(["draft", "published", "archived"]);
const ACTIVE_STOREFRONT_PRODUCT_FILTER = {
  publicationStatus: "published",
  isActive: true,
  isDeleted: { $ne: true },
};

const RESERVED_PRODUCT_FILTER_KEYS = new Set([
  "pageNumber",
  "limit",
  "keyword",
  "featured",
  "brand",
  "brands",
  "category",
  "inStock",
  "minPrice",
  "maxPrice",
  "sort",
]);

const normalizeFilterText = (value) => String(value || "").trim().toLowerCase();

const getMapValue = (mapLike, key) => {
  if (!mapLike || !key) return "";
  if (typeof mapLike.get === "function") return String(mapLike.get(key) || "");
  return String(mapLike[key] || "");
};

const getProductFieldValues = (product, key) => {
  const values = [];
  if (!product || !key) return values;

  const specValue = getMapValue(product.specs, key);
  if (specValue) values.push(specValue);

  for (const variant of product?.variants || []) {
    const attrValue = getMapValue(variant?.attributes, key);
    if (attrValue) values.push(attrValue);
  }

  return values.map((value) => String(value).trim()).filter(Boolean);
};

const productMatchesFilter = (product, key, rawValue) => {
  const expectedValues = String(rawValue || "")
    .split(",")
    .map((value) => normalizeFilterText(value))
    .filter(Boolean);
  if (!expectedValues.length) return true;

  const actualValues = getProductFieldValues(product, key).map(normalizeFilterText);
  if (!actualValues.length) return false;

  return expectedValues.some((expected) =>
    actualValues.some((actual) => actual.includes(expected) || expected.includes(actual))
  );
};

const collectDistinctValues = (products, key) => {
  const values = new Set();
  for (const product of products) {
    for (const value of getProductFieldValues(product, key)) {
      if (value) values.add(value.trim());
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
};

const getMinProductPrice = (product) => {
  const variantPrices = (product?.variants || [])
    .map((variant) => Number(variant?.price))
    .filter((value) => Number.isFinite(value) && value > 0);
  const basePrice = Number(product?.basePrice || 0);
  if (!variantPrices.length) return basePrice;
  return Math.min(basePrice > 0 ? basePrice : Infinity, ...variantPrices);
};

const getPriceRange = (products) => {
  const prices = products
    .map((product) => getMinProductPrice(product))
    .filter((price) => Number.isFinite(price) && price > 0);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

const formatFilterLabel = (key) =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const FILTER_UI_CONFIG = {
  ram: { label: "RAM", placeholder: "Any RAM" },
  storage: { label: "Storage", placeholder: "Any Storage" },
  color: { label: "Color", placeholder: "Any Color" },
  size: { label: "Size", placeholder: "Any Size" },
  screen: { label: "Screen", placeholder: "Any Screen" },
  screen_size: { label: "Screen Size", placeholder: "Any Size" },
  display: { label: "Display", placeholder: "Any Display" },
  display_type: { label: "Display Type", placeholder: "Any Type" },
  processor: { label: "Processor", placeholder: "Any Processor" },
  chipset: { label: "Chipset", placeholder: "Any Chipset" },
  battery: { label: "Battery", placeholder: "Any Battery" },
  battery_life: { label: "Battery Life", placeholder: "Any Battery Life" },
  refresh_rate: { label: "Refresh Rate", placeholder: "Any Refresh Rate" },
  camera: { label: "Camera", placeholder: "Any Camera" },
  connectivity: { label: "Connectivity", placeholder: "Any Connectivity" },
  material: { label: "Material", placeholder: "Any Material" },
  weight: { label: "Weight", placeholder: "Any Weight" },
};

const recordProductView = async ({ product, req }) => {
  const visitorKey = getVisitorKey(req);
  if (!visitorKey || !product?._id) return;

  const viewedAt = new Date();
  product.viewCount = Number(product.viewCount || 0) + 1;
  product.lastViewedAt = viewedAt;

  await Promise.all([
    product.save(),
    ProductView.create({
      product: product._id,
      visitorKey,
      viewedAt,
    }),
  ]);
};

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

const hasDeliveredPurchaseForProduct = async ({ productId, userId }) => {
  if (!productId || !userId) return false;

  const purchaseMatch = await Order.exists({
    user: userId,
    status: "delivered",
    "items.product": productId,
  });

  return Boolean(purchaseMatch);
};

const normalizePublicationStatus = (rawStatus, fallback = "draft") => {
  const normalized = String(rawStatus || "")
    .trim()
    .toLowerCase();
  return PUBLICATION_STATUSES.has(normalized) ? normalized : fallback;
};

const resolvePublicationStatus = ({
  publicationStatus,
  isActive,
  fallback = "draft",
}) => {
  if (publicationStatus !== undefined) {
    return normalizePublicationStatus(publicationStatus, fallback);
  }

  if (isActive === true) return "published";
  if (isActive === false) return fallback === "published" ? "draft" : fallback;
  return fallback;
};

const applyPublicationStatusToProduct = (product, nextStatus) => {
  product.publicationStatus = nextStatus;
  product.isActive = nextStatus === "published" && !product.isDeleted;
};

const collectNormalizedSkus = (variants = []) =>
  Array.from(
    new Set(
      (Array.isArray(variants) ? variants : [])
        .map((variant) => String(variant?.sku || "").trim())
        .filter(Boolean)
        .map((sku) => sku.toLowerCase())
    )
  );

const assertSkusAvailable = async (variants = [], excludeProductId = null) => {
  const normalizedSkus = collectNormalizedSkus(variants);
  if (!normalizedSkus.length) return;

  const query = {
    "variants.sku": { $in: normalizedSkus },
  };

  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }

  const conflictingProducts = await Product.find(query).select("name variants.sku");
  if (!conflictingProducts.length) return;

  const conflictingSku = normalizedSkus.find((sku) =>
    conflictingProducts.some((product) =>
      (product?.variants || []).some(
        (variant) => String(variant?.sku || "").trim().toLowerCase() === sku
      )
    )
  );

  if (!conflictingSku) return;

  const err = new Error(`SKU already exists: ${conflictingSku}`);
  err.statusCode = 409;
  throw err;
};

const slugifyText = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const makeUniqueSlug = async (baseSlug) => {
  const root = slugifyText(baseSlug) || `product-${Date.now()}`;
  let candidate = root;
  let suffix = 2;

  while (await Product.exists({ slug: candidate })) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const skuExists = async (sku) => {
  if (!sku) return false;
  const exists = await Product.exists({ "variants.sku": String(sku).trim() });
  return Boolean(exists);
};

const makeUniqueSku = async (baseSku, reserved = new Set()) => {
  const root = String(baseSku || "").trim() || "SKU";
  let candidate = root;
  let suffix = 2;

  while (reserved.has(candidate.toLowerCase()) || (await skuExists(candidate))) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  reserved.add(candidate.toLowerCase());
  return candidate;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const splitPipeValues = (value) =>
  String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

const downloadRemoteImageBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Failed to download image: ${url}`);
    error.statusCode = 400;
    throw error;
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    const error = new Error(`URL did not return an image: ${url}`);
    error.statusCode = 400;
    throw error;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const attachVariantImagesFromUrls = async (product, variants = []) => {
  if (!product || !Array.isArray(variants) || !variants.length) return { uploadedCount: 0, errors: [] };

  let uploadedCount = 0;
  const errors = [];

  for (const variantInput of variants) {
    const sku = String(variantInput?.sku || "").trim();
    const imageUrls = splitPipeValues(variantInput?.imageUrls);
    if (!sku || !imageUrls.length) continue;

    const variant = (product.variants || []).find(
      (item) => String(item?.sku || "").trim().toLowerCase() === sku.toLowerCase()
    );

    if (!variant) {
      errors.push({ sku, message: `Variant not found for image import: ${sku}` });
      continue;
    }

    for (const imageUrl of imageUrls) {
      try {
        const buffer = await downloadRemoteImageBuffer(imageUrl);
        const result = await uploadFromBuffer(buffer);
        variant.images.push({ url: result.secure_url, public_id: result.public_id });
        uploadedCount += 1;
      } catch (error) {
        errors.push({
          sku,
          imageUrl,
          message: error.message || `Failed to import image for SKU ${sku}`,
        });
      }
    }
  }

  if (uploadedCount > 0) {
    await product.save();
  }

  return { uploadedCount, errors };
};

const createProductDocument = async (input = {}) => {
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
    publicationStatus,
    isActive,
    variants,
  } = input;

  if (!name || !slug || !brand || !category || !description) {
    const error = new Error("name, slug, brand, category, description are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedSlug = String(slug).toLowerCase().trim();
  const exists = await Product.findOne({ slug: normalizedSlug });
  if (exists) {
    const error = new Error("Product slug already exists");
    error.statusCode = 409;
    throw error;
  }

  const normalizedVariants = Array.isArray(variants) ? variants : [];
  if (normalizedVariants.length) assertUniqueSkus(normalizedVariants);
  await assertSkusAvailable(normalizedVariants);

  const nextStatus = resolvePublicationStatus({
    publicationStatus,
    isActive,
    fallback: "draft",
  });

  return Product.create({
    name: String(name).trim(),
    slug: normalizedSlug,
    brand,
    category,
    description,
    basePrice: computeBasePrice(basePrice, normalizedVariants),
    highlights: Array.isArray(highlights) ? highlights : [],
    specs: specs || {},
    warrantyMonths: toNum(warrantyMonths, 0),
    tags: Array.isArray(tags) ? tags : [],
    publicationStatus: nextStatus,
    isFeatured: normalizeBoolean(isFeatured, false),
    variants: normalizedVariants,
    rating: 0,
    numReviews: 0,
    isActive: nextStatus === "published",
    isDeleted: false,
    deletedAt: null,
  });
};

// --- Public: GET /api/products (pagination + filters) ---
exports.getProducts = async (req, res) => {
  try {
    const pageSize = toNum(req.query.limit, 10);
    const page = toNum(req.query.pageNumber, 1);
    const dynamicFilters = Object.fromEntries(
      Object.entries(req.query).filter(([key, rawValue]) => {
        if (RESERVED_PRODUCT_FILTER_KEYS.has(key)) return false;
        return rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "";
      })
    );

    const filter = { ...ACTIVE_STOREFRONT_PRODUCT_FILTER };

    // text search
    if (req.query.keyword) {
      filter.$text = { $search: String(req.query.keyword) };
    }

    // featured
    if (req.query.featured === "true") {
      filter.isFeatured = true;
    }

    // brand filter (accept brandId or brandSlug)
    const brandValues = [
      ...new Set(
        String(req.query.brands || req.query.brand || "")
          .split(",")
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      ),
    ];
    if (brandValues.length) {
      const brandDocs = await Brand.find({
        $or: brandValues.flatMap((brandVal) => {
          const or = [{ slug: brandVal.toLowerCase() }];
          if (mongoose.Types.ObjectId.isValid(brandVal)) {
            or.unshift({ _id: brandVal });
          }
          return or;
        }),
      }).select("_id");

      const brandIds = brandDocs.map((doc) => doc._id);
      if (brandIds.length) {
        filter.brand = brandIds.length === 1 ? brandIds[0] : { $in: brandIds };
      }
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

    const baseQuery = Product.find(filter)
      .populate("category", "name slug")
      .populate("brand", "name slug")
      .sort(sort);

    if (Object.keys(dynamicFilters).length) {
      const allProducts = await baseQuery.select(
        "name slug basePrice variants specs highlights description tags rating isFeatured brand category"
      );
      let filteredProducts = allProducts.filter((product) =>
        Object.entries(dynamicFilters).every(([key, value]) => productMatchesFilter(product, key, value))
      );
      filteredProducts = await enrichProductsWithInventory(filteredProducts);
      await applyOfferPricingToProducts(filteredProducts);

      if (req.query.inStock === "true") {
        filteredProducts = filteredProducts.filter(
          (product) => Number(product?.inventorySummary?.available || 0) > 0
        );
      }

      const total = filteredProducts.length;
      const products = filteredProducts.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);

      return res.json({
        products,
        page,
        pages: Math.max(1, Math.ceil(total / pageSize)),
        total,
      });
    }

    if (req.query.inStock === "true") {
      const allProducts = await baseQuery;
      const annotated = await enrichProductsWithInventory(allProducts);
      const filtered = annotated.filter((product) => Number(product?.inventorySummary?.available || 0) > 0);
      await applyOfferPricingToProducts(filtered);
      const total = filtered.length;
      const products = filtered.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize);
      return res.json({
        products,
        page,
        pages: Math.max(1, Math.ceil(total / pageSize)),
        total,
      });
    }

    const count = await Product.countDocuments(filter);
    const products = await baseQuery.limit(pageSize).skip(pageSize * (page - 1));
    await enrichProductsWithInventory(products);
    await applyOfferPricingToProducts(products);

    res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
  } catch (error) {
    console.error("getProducts Error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

exports.getProductFilters = async (req, res) => {
  try {
    const categoryRaw = req.query.category;
    const category = categoryRaw ? await Category.findOne({
      $or: [
        { slug: String(categoryRaw).trim().toLowerCase() },
        ...(mongoose.Types.ObjectId.isValid(String(categoryRaw || "")) ? [{ _id: categoryRaw }] : []),
      ],
    }).select("_id name slug attributes") : null;

    const filter = { ...ACTIVE_STOREFRONT_PRODUCT_FILTER };
    if (category) filter.category = category._id;

    const products = await Product.find(filter)
      .select("basePrice variants specs brand category")
      .populate("brand", "name slug")
      .lean();

    const priceRange = getPriceRange(products);
    const categoryAttributes = Array.isArray(category?.attributes) ? category.attributes : [];
    const attributeFilters = categoryAttributes
      .filter((attr) => !["brand", "category"].includes(String(attr || "").toLowerCase()))
      .map((attrKey) => {
        const options = collectDistinctValues(products, attrKey);
        const ui = FILTER_UI_CONFIG[attrKey] || {};
        return {
          key: attrKey,
          label: ui.label || formatFilterLabel(attrKey),
          placeholder: ui.placeholder || `Any ${formatFilterLabel(attrKey)}`,
          options,
        };
      });

    const brands = Array.from(
      new Map(
        products
          .filter((product) => product?.brand?._id)
          .map((product) => [String(product.brand._id), product.brand])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
      priceRange,
      brands,
      attributeFilters,
    });
  } catch (error) {
    console.error("getProductFilters Error:", error);
    res.status(500).json({ message: "Failed to fetch product filters" });
  }
};

// Optional: GET /api/products/id/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    })
      .populate("category", "name slug parent")
      .populate("brand", "name slug");

    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }

    await recordProductView({ product, req });
    await enrichProductsWithInventory([product]);
    await applyOfferPricingToProducts([product]);
    res.json(product);
  } catch (error) {
    console.error("getProductById Error:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// --- Public: GET /api/products/:slug ---
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      ...ACTIVE_STOREFRONT_PRODUCT_FILTER,
    })
      .populate("category", "name slug parent")
      .populate("brand", "name slug");

    if (!product) return res.status(404).json({ message: "Product not found" });

    await recordProductView({ product, req });
    await enrichProductsWithInventory([product]);
    await applyOfferPricingToProducts([product]);
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

    await enrichProductsWithInventory(products);
    await applyOfferPricingToProducts(products);
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
      publicationStatus,
      isActive,
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
    const normalizedVariants = Array.isArray(variants) ? variants : [];
    if (normalizedVariants.length) assertUniqueSkus(normalizedVariants);
    await assertSkusAvailable(normalizedVariants);

    const nextStatus = resolvePublicationStatus({
      publicationStatus,
      isActive,
      fallback: "draft",
    });

    const product = await Product.create({
      name: String(name).trim(),
      slug: normalizedSlug,
      brand,
      category,
      description,
      basePrice: computeBasePrice(basePrice, normalizedVariants),
      highlights: Array.isArray(highlights) ? highlights : [],
      specs: specs || {},
      warrantyMonths: toNum(warrantyMonths, 0),
      tags: Array.isArray(tags) ? tags : [],
      publicationStatus: nextStatus,
      isFeatured: !!isFeatured,
      variants: normalizedVariants,
      rating: 0,
      numReviews: 0,
      isActive: nextStatus === "published",
      isDeleted: false,
      deletedAt: null,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("createProduct Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create product",
    });
  }
};

// --- Admin: POST /api/admin/products/bulk-import ---
exports.bulkImportProducts = async (req, res) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!products.length) {
      return res.status(400).json({ message: "products array is required" });
    }

    const fileSlugSet = new Set();
    const fileSkuSet = new Set();
    const created = [];
    const errors = [];

    for (const [index, rawProduct] of products.entries()) {
      const rowNumber = Number(rawProduct?.rowNumber || index + 2);

      try {
        const normalizedName = String(rawProduct?.name || "").trim();
        const normalizedSlug = slugifyText(rawProduct?.slug || normalizedName);

        if (!normalizedName) {
          throw Object.assign(new Error("Product name is required"), { statusCode: 400 });
        }
        if (!normalizedSlug) {
          throw Object.assign(new Error("Product slug is required"), { statusCode: 400 });
        }

        const slugKey = normalizedSlug.toLowerCase();
        if (fileSlugSet.has(slugKey)) {
          throw Object.assign(new Error(`Duplicate CSV slug: ${normalizedSlug}`), { statusCode: 400 });
        }
        fileSlugSet.add(slugKey);

        const variants = Array.isArray(rawProduct?.variants) ? rawProduct.variants : [];
        const normalizedVariantSkus = collectNormalizedSkus(variants);
        for (const sku of normalizedVariantSkus) {
          if (fileSkuSet.has(sku)) {
            throw Object.assign(new Error(`Duplicate CSV SKU: ${sku}`), { statusCode: 400 });
          }
          fileSkuSet.add(sku);
        }

        const product = await createProductDocument({
          ...rawProduct,
          name: normalizedName,
          slug: normalizedSlug,
        });

        const imageImport = await attachVariantImagesFromUrls(
          product,
          Array.isArray(rawProduct?.variants) ? rawProduct.variants : []
        );

        created.push({
          rowNumber,
          _id: product._id,
          name: product.name,
          slug: product.slug,
          publicationStatus: product.publicationStatus,
          uploadedImageCount: imageImport.uploadedCount,
        });
        if (imageImport.errors.length) {
          errors.push(
            ...imageImport.errors.map((item) => ({
              rowNumber,
              name: product.name,
              message: item.message,
            }))
          );
        }
      } catch (error) {
        errors.push({
          rowNumber,
          name: String(rawProduct?.name || "").trim() || `Row ${rowNumber}`,
          message: error.message || "Failed to import row",
        });
      }
    }

    res.status(created.length ? 201 : 400).json({
      createdCount: created.length,
      failedCount: errors.length,
      created,
      errors,
    });
  } catch (error) {
    console.error("bulkImportProducts Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to bulk import products",
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

    if (up.highlights !== undefined)
      product.highlights = Array.isArray(up.highlights) ? up.highlights : product.highlights;
    if (up.specs !== undefined) product.specs = up.specs || product.specs;
    if (up.warrantyMonths !== undefined)
      product.warrantyMonths = toNum(up.warrantyMonths, product.warrantyMonths);
    if (up.tags !== undefined) product.tags = Array.isArray(up.tags) ? up.tags : product.tags;

    if (up.isFeatured !== undefined) product.isFeatured = !!up.isFeatured;

    // variants replace (simple approach)
    if (up.variants !== undefined) {
      const nextVariants = Array.isArray(up.variants) ? up.variants : product.variants;
      // ✅ SKU uniqueness inside this product
      assertUniqueSkus(nextVariants);
      await assertSkusAvailable(nextVariants, product._id);
      product.variants = nextVariants;
    }

    // keep basePrice aligned with variants when present
    product.basePrice = computeBasePrice(
      up.basePrice !== undefined ? up.basePrice : product.basePrice,
      product.variants
    );

    if (up.publicationStatus !== undefined || up.isActive !== undefined) {
      const nextStatus = resolvePublicationStatus({
        publicationStatus: up.publicationStatus,
        isActive: up.isActive,
        fallback: product.publicationStatus || (product.isActive ? "published" : "draft"),
      });
      applyPublicationStatusToProduct(product, nextStatus);
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

// --- Admin: POST /api/admin/products/:id/duplicate ---
exports.duplicateProduct = async (req, res) => {
  try {
    const source = await Product.findById(req.params.id);
    if (!source) return res.status(404).json({ message: "Product not found" });

    const duplicateSlug = await makeUniqueSlug(`${source.slug || source.name}-copy`);
    const skuReservations = new Set();
    const duplicatedVariants = [];

    for (const variant of source.variants || []) {
      const nextSku = await makeUniqueSku(`${variant.sku || "SKU"}-COPY`, skuReservations);
      duplicatedVariants.push({
        sku: nextSku,
        attributes:
          typeof variant.attributes?.toObject === "function"
            ? variant.attributes.toObject()
            : Object.fromEntries(Object.entries(variant.attributes || {})),
        price: Number(variant.price || 0),
        countInStock: 0,
        lowStockThreshold: Number(variant.lowStockThreshold || 5),
        images: [],
        isDefault: !!variant.isDefault,
      });
    }

    const duplicate = await Product.create({
      name: `${source.name} Copy`,
      slug: duplicateSlug,
      brand: source.brand,
      category: source.category,
      description: source.description,
      basePrice: computeBasePrice(source.basePrice, duplicatedVariants),
      highlights: Array.isArray(source.highlights) ? source.highlights : [],
      specs:
        typeof source.specs?.toObject === "function" ? source.specs.toObject() : source.specs || {},
      warrantyMonths: toNum(source.warrantyMonths, 0),
      tags: Array.isArray(source.tags) ? source.tags : [],
      publicationStatus: "draft",
      isFeatured: false,
      variants: duplicatedVariants,
      rating: 0,
      numReviews: 0,
      reviews: [],
      viewCount: 0,
      lastViewedAt: null,
      isActive: false,
      isDeleted: false,
      deletedAt: null,
      metaTitle: source.metaTitle || "",
      metaDescription: source.metaDescription || "",
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error("duplicateProduct Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to duplicate product",
    });
  }
};

// --- Admin: DELETE /api/admin/products/:id ---
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.isDeleted) {
      return res.json({ message: "Product already deleted" });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.isActive = false;
    product.publicationStatus = "archived";
    await product.save();

    res.json({ message: "Product deleted from storefront but kept in database" });
  } catch (error) {
    console.error("deleteProduct Error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

// --- Public: GET /api/products/featured ---
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      ...ACTIVE_STOREFRONT_PRODUCT_FILTER,
    })
      .populate("category", "name slug")
      .populate("brand", "name slug")
      .limit(8)
      .sort({ createdAt: -1 });

    await enrichProductsWithInventory(products);
    await applyOfferPricingToProducts(products);
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
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
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

    if (req.user?.isAdmin) {
      return res.status(403).json({ message: "Admins cannot submit product reviews" });
    }

    const verifiedPurchase = await hasDeliveredPurchaseForProduct({
      productId: product._id,
      userId: req.user._id,
    });

    if (!verifiedPurchase) {
      return res.status(403).json({
        message: "Only customers with a delivered order for this product can submit a review",
      });
    }

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

exports.getProductReviewEligibility = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).select("_id isActive reviews.user");
    if (!product || product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.user?.isAdmin) {
      return res.json({
        canReview: false,
        hasPurchased: false,
        hasExistingReview: false,
        message: "Admin accounts can read reviews, but only customers can post them.",
      });
    }

    const hasPurchased = await hasDeliveredPurchaseForProduct({
      productId: product._id,
      userId: req.user._id,
    });

    const hasExistingReview = product.reviews.some(
      (review) => String(review.user) === String(req.user._id)
    );

    return res.json({
      canReview: hasPurchased,
      hasPurchased,
      hasExistingReview,
      message: hasPurchased
        ? hasExistingReview
          ? "You can update your review because this purchase was delivered."
          : "Your delivered order makes you eligible to review this product."
        : "Only customers with a delivered order for this product can submit a review.",
    });
  } catch (error) {
    console.error("getProductReviewEligibility Error:", error);
    res.status(500).json({ message: "Failed to check review eligibility" });
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
