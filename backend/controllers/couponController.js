// controllers/couponController.js
const Coupon = require("../models/Coupon");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normalizeCouponType = (value) => {
  const type = String(value || "").toUpperCase().trim();
  return type === "FLAT" ? "FIXED" : type;
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
      validFrom,
      validTo,
      isActive,
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
      isActive: !!isActive,
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
      validFrom,
      validTo,
      isActive,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    if (code !== undefined) coupon.code = String(code).toUpperCase().trim();
    if (description !== undefined) coupon.description = description.trim();
    if (type !== undefined) coupon.type = normalizeCouponType(type);
    if (value !== undefined) coupon.value = toNum(value, coupon.value);
    if (maxDiscount !== undefined)
      coupon.maxDiscount = maxDiscount === null ? undefined : toNum(maxDiscount, 0);
    if (minCartTotal !== undefined)
      coupon.minCartTotal =
        minCartTotal === null ? undefined : toNum(minCartTotal, 0);
    if (usageLimit !== undefined) coupon.usageLimit = toNum(usageLimit, 0);
    if (isActive !== undefined) coupon.isActive = !!isActive;

    if (validFrom !== undefined)
      coupon.validFrom = validFrom ? new Date(validFrom) : undefined;
    if (validTo !== undefined)
      coupon.validTo = validTo ? new Date(validTo) : undefined;

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
