// controllers/couponController.js
const Coupon = require("../models/Coupon");

exports.createCoupon = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.code || !payload.type || payload.value === undefined) {
      return res.status(400).json({ message: "code, type, value are required" });
    }

    payload.code = String(payload.code).toUpperCase().trim();

    const exists = await Coupon.findOne({ code: payload.code });
    if (exists) return res.status(409).json({ message: "Coupon code already exists" });

    const c = await Coupon.create(payload);
    res.status(201).json(c);
  } catch (e) {
    console.error("createCoupon:", e);
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

// Public validate endpoint (optional)
// GET /api/coupons/validate?code=XYZ&cartTotal=5000
exports.validateCoupon = async (req, res) => {
  try {
    const code = String(req.query.code || "").toUpperCase().trim();
    const cartTotal = Number(req.query.cartTotal || 0);
    if (!code) return res.status(400).json({ message: "code is required" });

    const coupon = await Coupon.findOne({ code, isActive: true });
    if (!coupon) return res.status(404).json({ message: "Invalid coupon" });

    const now = Date.now();
    if (coupon.validFrom && now < new Date(coupon.validFrom).getTime()) return res.status(400).json({ message: "Coupon not active yet" });
    if (coupon.validTo && now > new Date(coupon.validTo).getTime()) return res.status(400).json({ message: "Coupon expired" });
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: "Coupon usage limit reached" });
    if (cartTotal < (coupon.minCartTotal || 0)) return res.status(400).json({ message: "Cart total too low for this coupon" });

    res.json({ ok: true, coupon });
  } catch (e) {
    console.error("validateCoupon:", e);
    res.status(500).json({ message: "Failed to validate coupon" });
  }
};
