// controllers/couponController.js
const Coupon = require("../models/Coupon");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/UserModel");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normalizeCouponType = (value) => {
  const type = String(value || "").toUpperCase().trim();
  return type === "FLAT" ? "FIXED" : type;
};

const normalizeEligibility = (value) => {
  const normalized = String(value || "ALL").toUpperCase().trim();
  return ["ALL", "SPECIFIC_USERS", "NEW_CUSTOMERS", "RETURNING_CUSTOMERS"].includes(normalized)
    ? normalized
    : "ALL";
};

const normalizeDiscountAppliesTo = (value) => {
  const normalized = String(value || "ELIGIBLE_ITEMS").toUpperCase().trim();
  return ["ELIGIBLE_ITEMS", "ENTIRE_CART"].includes(normalized)
    ? normalized
    : "ELIGIBLE_ITEMS";
};

const normalizeIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter((entry) => mongoose.Types.ObjectId.isValid(entry));
};

const clampLimit = (value, fallback = 8, max = 25) => {
  const num = toNum(value, fallback);
  return Math.max(1, Math.min(max, num));
};

const buildRegex = (value) => new RegExp(String(value || "").trim(), "i");

const toCodeSlug = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);

const randomCodePart = (length = 6) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

exports.adminGenerateCouponCode = async (req, res) => {
  try {
    const baseHint = toCodeSlug(req.query.prefix || req.query.hint || "SPLASH");
    const prefix = baseHint || "SPLASH";

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const code = `${prefix}-${randomCodePart(6)}`;
      const existing = await Coupon.exists({ code });
      if (!existing) {
        return res.json({ code });
      }
    }

    return res.status(500).json({ message: "Failed to generate a unique coupon code" });
  } catch (err) {
    console.error("adminGenerateCouponCode error:", err);
    return res.status(500).json({ message: "Failed to generate coupon code" });
  }
};

exports.adminLookupCouponProducts = async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const limit = clampLimit(req.query.limit, 8, 20);
    const filter = {};

    if (keyword) {
      const rx = buildRegex(keyword);
      filter.$or = [{ name: rx }, { slug: rx }];
    }

    const products = await Product.find(filter)
      .sort(keyword ? { name: 1 } : { createdAt: -1 })
      .limit(limit)
      .select("_id name slug publicationStatus")
      .lean();

    res.json({ items: products });
  } catch (err) {
    console.error("adminLookupCouponProducts error:", err);
    res.status(500).json({ message: "Failed to search products" });
  }
};

exports.adminLookupCouponCategories = async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const limit = clampLimit(req.query.limit, 8, 20);
    const filter = {};

    if (keyword) {
      const rx = buildRegex(keyword);
      filter.$or = [{ name: rx }, { slug: rx }];
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .limit(limit)
      .select("_id name slug")
      .lean();

    res.json({ items: categories });
  } catch (err) {
    console.error("adminLookupCouponCategories error:", err);
    res.status(500).json({ message: "Failed to search categories" });
  }
};

exports.adminLookupCouponUsers = async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const limit = clampLimit(req.query.limit, 8, 20);
    const filter = { isAdmin: false };

    if (keyword) {
      const rx = buildRegex(keyword);
      filter.$or = [{ name: rx }, { email: rx }, { number: rx }];
    }

    const users = await User.find(filter)
      .sort(keyword ? { name: 1 } : { createdAt: -1 })
      .limit(limit)
      .select("_id name email number createdAt")
      .lean();

    res.json({ items: users });
  } catch (err) {
    console.error("adminLookupCouponUsers error:", err);
    res.status(500).json({ message: "Failed to search customers" });
  }
};

// GET /api/admin/coupons?keyword=&page=&limit=
exports.adminListCoupons = async (req, res) => {
  try {
    const pageSize = toNum(req.query.limit, 20);
    const page = toNum(req.query.page, 1);
    const keyword = (req.query.keyword || "").trim();
    const status = (req.query.status || "").trim();

    const filter = {};

    if (keyword) {
      filter.$or = [
        { code: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    const now = new Date();

    if (status === "active") {
      filter.isActive = true;
      filter.$and = [
        {
          $or: [
            { validFrom: { $exists: false } },
            { validFrom: null },
            { validFrom: { $lte: now } },
          ],
        },
        {
          $or: [
            { validTo: { $exists: false } },
            { validTo: null },
            { validTo: { $gte: now } },
          ],
        },
      ];
    } else if (status === "disabled") {
      filter.isActive = false;
    } else if (status === "upcoming") {
      filter.isActive = true;
      filter.validFrom = { $gt: now };
    } else if (status === "expired") {
      filter.isActive = true;
      filter.validTo = { $lt: now };
    }

    const totalCoupons = await Coupon.countDocuments(filter);

    const coupons = await Coupon.find(filter)
      .populate("applicableProducts", "name slug")
      .populate("applicableCategories", "name slug")
      .populate("applicableUsers", "name email")
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .lean();

    // Metrics
    const totalAll = await Coupon.countDocuments({});
    const activeFlag = await Coupon.countDocuments({ isActive: true });
    const disabledCount = await Coupon.countDocuments({ isActive: false });
    const upcomingCount = await Coupon.countDocuments({
      isActive: true,
      validFrom: { $gt: now },
    });
    const expiredCount = await Coupon.countDocuments({
      isActive: true,
      validTo: { $lt: now },
    });

    res.json({
      coupons,
      page,
      pages: Math.ceil(totalCoupons / pageSize),
      totalCoupons,
      metrics: {
        totalAll,
        activeFlag,
        disabledCount,
        upcomingCount,
        expiredCount,
      },
    });
  } catch (err) {
    console.error("adminListCoupons error:", err);
    res.status(500).json({ message: "Failed to load coupons" });
  }
};

// POST /api/admin/coupons
// body: { code, description, type, value, maxDiscount, minCartTotal, usageLimit, validFrom, validTo, isActive }
exports.adminCreateCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      maxDiscount,
      minCartTotal,
      usageLimit,
      perCustomerUsageLimit,
      validFrom,
      validTo,
      isActive,
      customerEligibility,
      discountAppliesTo,
      applicableProducts,
      applicableCategories,
      applicableUsers,
    } = req.body;

    if (!code || !type || value === undefined) {
      return res
        .status(400)
        .json({ message: "code, type and value are required" });
    }

    const payload = {
      code: String(code).toUpperCase().trim(),
      description: description?.trim() || "",
      type: normalizeCouponType(type), // "PERCENT" or "FIXED"
      value: toNum(value, 0),
      maxDiscount: maxDiscount !== undefined ? toNum(maxDiscount, 0) : undefined,
      minCartTotal: minCartTotal !== undefined ? toNum(minCartTotal, 0) : undefined,
      usageLimit: usageLimit !== undefined ? toNum(usageLimit, 0) : 0,
      perCustomerUsageLimit:
        perCustomerUsageLimit !== undefined ? toNum(perCustomerUsageLimit, 0) : 0,
      isActive: !!isActive,
      customerEligibility: normalizeEligibility(customerEligibility),
      discountAppliesTo: normalizeDiscountAppliesTo(discountAppliesTo),
      applicableProducts: normalizeIdArray(applicableProducts),
      applicableCategories: normalizeIdArray(applicableCategories),
      applicableUsers: normalizeIdArray(applicableUsers),
    };

    if (validFrom) payload.validFrom = new Date(validFrom);
    if (validTo) payload.validTo = new Date(validTo);

    const existing = await Coupon.findOne({ code: payload.code });
    if (existing) {
      return res.status(409).json({ message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create(payload);
    res.status(201).json(coupon);
  } catch (err) {
    console.error("adminCreateCoupon error:", err);
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

// PUT /api/admin/coupons/:id
exports.adminUpdateCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      maxDiscount,
      minCartTotal,
      usageLimit,
      perCustomerUsageLimit,
      validFrom,
      validTo,
      isActive,
      customerEligibility,
      discountAppliesTo,
      applicableProducts,
      applicableCategories,
      applicableUsers,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    if (code !== undefined) {
      const nextCode = String(code).toUpperCase().trim();
      const existing = await Coupon.findOne({
        code: nextCode,
        _id: { $ne: coupon._id },
      }).select("_id");
      if (existing) {
        return res.status(409).json({ message: "Coupon code already exists" });
      }
      coupon.code = nextCode;
    }
    if (description !== undefined) coupon.description = description.trim();
    if (type !== undefined) coupon.type = normalizeCouponType(type);
    if (value !== undefined) coupon.value = toNum(value, coupon.value);
    if (maxDiscount !== undefined)
      coupon.maxDiscount = maxDiscount === null ? undefined : toNum(maxDiscount, 0);
    if (minCartTotal !== undefined)
      coupon.minCartTotal =
        minCartTotal === null ? undefined : toNum(minCartTotal, 0);
    if (usageLimit !== undefined) coupon.usageLimit = toNum(usageLimit, 0);
    if (perCustomerUsageLimit !== undefined)
      coupon.perCustomerUsageLimit = toNum(perCustomerUsageLimit, 0);
    if (isActive !== undefined) coupon.isActive = !!isActive;
    if (customerEligibility !== undefined)
      coupon.customerEligibility = normalizeEligibility(customerEligibility);
    if (discountAppliesTo !== undefined)
      coupon.discountAppliesTo = normalizeDiscountAppliesTo(discountAppliesTo);

    if (validFrom !== undefined)
      coupon.validFrom = validFrom ? new Date(validFrom) : undefined;
    if (validTo !== undefined)
      coupon.validTo = validTo ? new Date(validTo) : undefined;
    if (applicableProducts !== undefined)
      coupon.applicableProducts = normalizeIdArray(applicableProducts);
    if (applicableCategories !== undefined)
      coupon.applicableCategories = normalizeIdArray(applicableCategories);
    if (applicableUsers !== undefined)
      coupon.applicableUsers = normalizeIdArray(applicableUsers);

    const updated = await coupon.save();
    res.json(updated);
  } catch (err) {
    console.error("adminUpdateCoupon error:", err);
    res.status(500).json({ message: "Failed to update coupon" });
  }
};

// DELETE /api/admin/coupons/:id
// Soft delete: just mark inactive
exports.adminDeleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    coupon.isActive = false;
    const updated = await coupon.save();

    res.json({
      message: "Coupon deactivated",
      coupon: updated,
    });
  } catch (err) {
    console.error("adminDeleteCoupon error:", err);
    res.status(500).json({ message: "Failed to delete coupon" });
  }
};
