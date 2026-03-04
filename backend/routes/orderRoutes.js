const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  createOrderFromCart,
  getMyOrders,
  getOrderByOrderNo,
  adminGetOrders,
  adminUpdateOrderStatus,
  cancelMyOrder,
  confirmMyDelivery,
  requestMyRefund,
} = require("../controllers/orderController");

router.post("/", protect, createOrderFromCart);
router.get("/my", protect, getMyOrders);
router.post("/:orderNo/cancel", protect, cancelMyOrder);
router.post("/:orderNo/confirm-delivery", protect, confirmMyDelivery);
router.post("/:orderNo/refund", protect, requestMyRefund);
router.get("/:orderNo", protect, getOrderByOrderNo);

router.get("/admin/all", protect, admin, adminGetOrders);
router.put("/admin/:orderNo/status", protect, admin, adminUpdateOrderStatus);

module.exports = router;
