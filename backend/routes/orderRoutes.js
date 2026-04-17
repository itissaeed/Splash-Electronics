const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect, admin } = require("../middleware/authMiddleware");

const {
  createOrderFromCart,
  validateCoupon,
  getMyOrders,
  getOrderByOrderNo,
  adminGetOrders,
  adminUpdateOrderStatus,
  adminUpdateShipment,
  cancelMyOrder,
  confirmMyDelivery,
  requestMyRefund,
} = require("../controllers/orderController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", protect, createOrderFromCart);
router.post("/validate-coupon", protect, validateCoupon);
router.get("/my", protect, getMyOrders);
router.post("/:orderNo/cancel", protect, cancelMyOrder);
router.post("/:orderNo/confirm-delivery", protect, confirmMyDelivery);
router.post("/:orderNo/refund", protect, upload.array("evidenceImages", 5), requestMyRefund);
router.get("/:orderNo", protect, getOrderByOrderNo);

router.get("/admin/all", protect, admin, adminGetOrders);
router.put("/admin/:orderNo/status", protect, admin, adminUpdateOrderStatus);
router.patch("/admin/:orderNo/shipment", protect, admin, adminUpdateShipment);

module.exports = router;
