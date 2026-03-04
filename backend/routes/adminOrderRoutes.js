const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  adminGetOrders,
  adminUpdateOrderStatus,
  adminGetOrderNotifications,
  adminDispatchOrder,
  adminDeleteOrder,
} = require("../controllers/orderController");

// GET /api/admin/orders/notifications?since=ISO_DATE&limit=10
router.get("/notifications", protect, admin, adminGetOrderNotifications);

// GET /api/admin/orders?status=all&page=1&limit=20&keyword=ORD
router.get("/", protect, admin, adminGetOrders);

// PUT /api/admin/orders/:orderNo/status
router.put("/:orderNo/status", protect, admin, adminUpdateOrderStatus);
// POST /api/admin/orders/:orderNo/dispatch
router.post("/:orderNo/dispatch", protect, admin, adminDispatchOrder);
// DELETE /api/admin/orders/:orderNo
router.delete("/:orderNo", protect, admin, adminDeleteOrder);

module.exports = router;
