const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  createOrderFromCart,
  getMyOrders,
  getOrderByOrderNo,
  adminGetOrders,
  adminUpdateOrderStatus,
} = require("../controllers/orderController");

router.post("/", protect, createOrderFromCart);
router.get("/my", protect, getMyOrders);
router.get("/:orderNo", protect, getOrderByOrderNo);

router.get("/admin/all", protect, admin, adminGetOrders);
router.put("/admin/:orderNo/status", protect, admin, adminUpdateOrderStatus);

module.exports = router;
