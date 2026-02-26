const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  initSslCommerz,
  sslCommerzIpn,
  sslCommerzSuccess,
  sslCommerzFail,
  sslCommerzCancel,
} = require("../controllers/paymentController");

router.post("/sslcommerz/init", protect, initSslCommerz);
router.post("/sslcommerz/ipn", sslCommerzIpn);
router.post("/sslcommerz/success", sslCommerzSuccess);
router.post("/sslcommerz/fail", sslCommerzFail);
router.post("/sslcommerz/cancel", sslCommerzCancel);

router.get("/sslcommerz/success", sslCommerzSuccess);
router.get("/sslcommerz/fail", sslCommerzFail);
router.get("/sslcommerz/cancel", sslCommerzCancel);

module.exports = router;
