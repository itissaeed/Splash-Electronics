const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");

const USAGE_KEYWORDS = {
  gaming: [
    "gaming",
    "gpu",
    "graphics",
    "rtx",
    "high refresh",
    "144hz",
    "120hz",
  ],
  study: ["study", "student", "battery", "lightweight", "portable", "online class"],
  office: ["office", "business", "productivity", "excel", "meeting", "work"],
  media: ["media", "display", "oled", "amoled", "speaker", "netflix", "youtube"],
};

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value) => String(value || "").trim().toLowerCase();

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMapValue = (mapLike, key) => {
  if (!mapLike || !key) return "";
  if (typeof mapLike.get === "function") return String(mapLike.get(key) || "");
  return String(mapLike[key] || "");
};

const getVariantAttributeValue = (product, key) => {
  if (!product?.variants?.length) return "";
  for (const variant of product.variants) {
    const value = getMapValue(variant?.attributes, key);
    if (value) return value;
  }
  return "";
};

const getSpecValue = (product, key) => getMapValue(product?.specs, key);

const getBestFieldValue = (product, key) => {
  const fromVariant = getVariantAttributeValue(product, key);
  if (fromVariant) return fromVariant;
  return getSpecValue(product, key);
};

const getMinPrice = (product) => {
  const variantPrices = (product?.variants || [])
    .map((v) => toNum(v?.price, NaN))
    .filter((v) => Number.isFinite(v) && v > 0);

  const basePrice = toNum(product?.basePrice, 0);
  if (!variantPrices.length) return basePrice;
  return Math.min(basePrice > 0 ? basePrice : Infinity, ...variantPrices);
};

const parseMemoryToGB = (raw) => {
  const text = toText(raw);
  if (!text) return 0;

  const num = Number((text.match(/(\d+(\.\d+)?)/) || [])[1] || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;

  if (text.includes("tb")) return num * 1024;
  return num;
};

const normalizeBudget = (minRaw, maxRaw) => {
  let min = toNum(minRaw, 0);
  let max = toNum(maxRaw, 0);
  if (min > 0 && max > 0 && min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return { min, max };
};

const scorePriceFit = (price, minBudget, maxBudget) => {
  if (price <= 0 || (minBudget <= 0 && maxBudget <= 0)) {
    return { score: 0, reason: "" };
  }

  if ((minBudget <= 0 || price >= minBudget) && (maxBudget <= 0 || price <= maxBudget)) {
    let closenessScore = 40;
    if (minBudget > 0 && maxBudget > 0) {
      const center = (minBudget + maxBudget) / 2;
      const spread = Math.max(1, (maxBudget - minBudget) / 2);
      const distance = Math.abs(price - center);
      const closeness = Math.max(0, 1 - distance / spread);
      closenessScore = 32 + closeness * 12;
    }
    return { score: closenessScore, reason: "Fits your budget" };
  }

  if (maxBudget > 0 && price <= maxBudget * 1.12) {
    return { score: 10, reason: "Slightly above budget, still close" };
  }

  if (minBudget > 0 && price >= minBudget * 0.9) {
    return { score: 4, reason: "Close to your budget range" };
  }

  return { score: -18, reason: "" };
};

const scoreCapacity = (actual, preferred, label) => {
  if (preferred <= 0 || actual <= 0) return { score: 0, reason: "" };
  if (actual >= preferred) return { score: 14, reason: `Meets ${label} need` };

  const ratio = actual / preferred;
  if (ratio >= 0.8) return { score: 5, reason: `Close to your ${label} need` };
  return { score: -8, reason: "" };
};

const resolveCategory = async (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();

  if (isObjectId(value)) {
    const byId = await Category.findById(value).select("_id name slug attributes");
    if (byId) return byId;
  }

  return Category.findOne({
    $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${escapeRegExp(value)}$`, "i") }],
  }).select("_id name slug attributes");
};

const resolveBrand = async (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();

  if (isObjectId(value)) {
    const byId = await Brand.findById(value).select("_id name slug");
    if (byId) return byId;
  }

  return Brand.findOne({
    $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${escapeRegExp(value)}$`, "i") }],
  }).select("_id name slug");
};

const collectValues = (products, key) => {
  const values = new Set();

  for (const product of products) {
    for (const variant of product?.variants || []) {
      const value = getMapValue(variant?.attributes, key);
      if (value) values.add(value.trim());
    }
    const specValue = getSpecValue(product, key);
    if (specValue) values.add(specValue.trim());
  }

  return Array.from(values).sort((a, b) => a.localeCompare(b));
};

const buildSearchBlob = (product) => {
  const specs = product?.specs && typeof product.specs.entries === "function"
    ? Object.fromEntries(product.specs.entries())
    : (product?.specs || {});
  const specText = Object.entries(specs)
    .map(([k, v]) => `${k} ${v}`)
    .join(" ");
  const highlightText = (product?.highlights || []).join(" ");
  const tagText = (product?.tags || []).join(" ");
  return `${product?.name || ""} ${product?.description || ""} ${specText} ${highlightText} ${tagText}`.toLowerCase();
};

exports.getAdvisorMetadata = async (req, res) => {
  try {
    const categoryRaw = req.query.category;
    const category = await resolveCategory(categoryRaw);

    const filter = { isActive: true };
    if (category) filter.category = category._id;

    const products = await Product.find(filter)
      .populate("brand", "name slug")
      .select("brand specs variants");

    const brandMap = new Map();
    for (const p of products) {
      if (p?.brand?._id) {
        brandMap.set(String(p.brand._id), {
          _id: p.brand._id,
          name: p.brand.name,
          slug: p.brand.slug,
        });
      }
    }

    const categoryAttributes = Array.isArray(category?.attributes) ? category.attributes : [];
    const dynamicAttributes = categoryAttributes.filter((attr) => !["ram", "storage"].includes(attr));

    const dynamicQuestions = dynamicAttributes.map((attrKey) => ({
      key: attrKey,
      label: attrKey.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
      options: collectValues(products, attrKey),
    }));

    return res.json({
      category: category
        ? { _id: category._id, name: category.name, slug: category.slug }
        : null,
      brands: Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      ramOptions: collectValues(products, "ram"),
      storageOptions: collectValues(products, "storage"),
      usageOptions: ["gaming", "study", "office", "media"],
      dynamicQuestions,
    });
  } catch (error) {
    console.error("getAdvisorMetadata Error:", error);
    res.status(500).json({ message: "Failed to load advisor metadata" });
  }
};

exports.getAdvisorRecommendations = async (req, res) => {
  try {
    const {
      budgetMin,
      budgetMax,
      category: categoryRaw,
      brand: brandRaw,
      usage = [],
      ram = "",
      storage = "",
      attributePreferences = {},
    } = req.body || {};

    const category = await resolveCategory(categoryRaw);
    const brand = await resolveBrand(brandRaw);

    const filter = { isActive: true };
    if (category) filter.category = category._id;
    if (brand) filter.brand = brand._id;

    const products = await Product.find(filter)
      .populate("brand", "name slug")
      .populate("category", "name slug")
      .select(
        "name slug basePrice variants specs highlights description tags rating isFeatured brand category"
      );

    const { min: minBudget, max: maxBudget } = normalizeBudget(budgetMin, budgetMax);
    const normalizedUsage = Array.isArray(usage)
      ? usage.map((u) => toText(u)).filter(Boolean)
      : [toText(usage)].filter(Boolean);

    const preferredRamGB = parseMemoryToGB(ram);
    const preferredStorageGB = parseMemoryToGB(storage);

    const ranked = products.map((product) => {
      const reasons = [];
      let score = 0;

      const price = getMinPrice(product);
      const priceFit = scorePriceFit(price, minBudget, maxBudget);
      score += priceFit.score;
      if (priceFit.reason) reasons.push(priceFit.reason);

      if (brand && String(product?.brand?._id) === String(brand._id)) {
        score += 20;
        reasons.push(`Matches preferred brand (${brand.name})`);
      }

      const searchBlob = buildSearchBlob(product);
      for (const useCase of normalizedUsage) {
        const terms = USAGE_KEYWORDS[useCase] || [useCase];
        if (terms.some((term) => searchBlob.includes(term))) {
          score += 10;
          reasons.push(`Good for ${useCase}`);
        }
      }

      const productRamGB = parseMemoryToGB(getBestFieldValue(product, "ram"));
      const ramScore = scoreCapacity(productRamGB, preferredRamGB, "RAM");
      score += ramScore.score;
      if (ramScore.reason) reasons.push(ramScore.reason);

      const productStorageGB = parseMemoryToGB(getBestFieldValue(product, "storage"));
      const storageScore = scoreCapacity(productStorageGB, preferredStorageGB, "storage");
      score += storageScore.score;
      if (storageScore.reason) reasons.push(storageScore.reason);

      const dynamicPrefs = attributePreferences && typeof attributePreferences === "object"
        ? attributePreferences
        : {};

      Object.entries(dynamicPrefs).forEach(([key, preferredValue]) => {
        const expected = toText(preferredValue);
        if (!expected) return;
        const actual = toText(getBestFieldValue(product, key));
        if (actual.includes(expected)) {
          score += 8;
          reasons.push(`Matches ${key.replace(/_/g, " ")}`);
        } else if (actual) {
          score -= 2;
        }
      });

      score += Math.min(10, toNum(product.rating, 0) * 2);
      if (product.isFeatured) score += 3;

      const knownDataPoints = [productRamGB, productStorageGB, price].filter((v) => v > 0).length;
      score += knownDataPoints * 0.8;

      return {
        product,
        score,
        reasons: Array.from(new Set(reasons)).slice(0, 4),
      };
    });

    ranked.sort((a, b) => b.score - a.score);

    const recommendations = [];
    const usedBrands = new Set();
    for (const item of ranked) {
      const brandId = String(item?.product?.brand?._id || "");
      const keepBecauseStrong = item.score >= (ranked[0]?.score || 0) - 8;
      if (usedBrands.has(brandId) && !keepBecauseStrong) continue;
      recommendations.push(item);
      if (brandId) usedBrands.add(brandId);
      if (recommendations.length === 3) break;
    }

    if (recommendations.length < 3) {
      for (const item of ranked) {
        if (recommendations.includes(item)) continue;
        recommendations.push(item);
        if (recommendations.length === 3) break;
      }
    }

    const bestScore = recommendations[0]?.score || 1;
    const recommendationPayload = recommendations.map((item) => {
      const p = item.product;
      const confidence = Math.max(1, Math.min(100, Math.round((item.score / bestScore) * 100)));
      return {
        _id: p._id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        category: p.category,
        basePrice: p.basePrice,
        variants: p.variants || [],
        score: item.score,
        confidence,
        reasons: item.reasons,
      };
    });

    res.json({
      criteria: {
        budgetMin: minBudget || null,
        budgetMax: maxBudget || null,
        category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
        brand: brand ? { _id: brand._id, name: brand.name, slug: brand.slug } : null,
        usage: normalizedUsage,
        ram: ram || null,
        storage: storage || null,
      },
      totalConsidered: ranked.length,
      recommendations: recommendationPayload,
    });
  } catch (error) {
    console.error("getAdvisorRecommendations Error:", error);
    res.status(500).json({ message: "Failed to generate recommendations" });
  }
};
