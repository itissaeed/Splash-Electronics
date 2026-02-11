const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  adminGetOrders,
  adminUpdateOrderStatus,
} = require("../controllers/orderController");

// GET /api/admin/orders?status=all&page=1&limit=20&keyword=ORD
router.get("/", protect, admin, adminGetOrders);

// PUT /api/admin/orders/:orderNo/status
router.put("/:orderNo/status", protect, admin, adminUpdateOrderStatus);

module.exports = router;
