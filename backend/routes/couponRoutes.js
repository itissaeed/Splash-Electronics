// routes/CouponRoutes.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  adminGenerateCouponCode,
  adminLookupCouponProducts,
  adminLookupCouponCategories,
  adminLookupCouponUsers,
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} = require("../controllers/couponController");

// GET /api/admin/coupons/generate-code
router.get("/generate-code", protect, admin, adminGenerateCouponCode);
router.get("/lookups/products", protect, admin, adminLookupCouponProducts);
router.get("/lookups/categories", protect, admin, adminLookupCouponCategories);
router.get("/lookups/users", protect, admin, adminLookupCouponUsers);

// GET /api/admin/coupons
router.get("/", protect, admin, adminListCoupons);

// POST /api/admin/coupons
router.post("/", protect, admin, adminCreateCoupon);

// PUT /api/admin/coupons/:id
router.put("/:id", protect, admin, adminUpdateCoupon);

// DELETE /api/admin/coupons/:id
router.delete("/:id", protect, admin, adminDeleteCoupon);

module.exports = router;
