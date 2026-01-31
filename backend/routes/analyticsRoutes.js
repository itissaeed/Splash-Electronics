const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  bestSellers,
  regionSales,
  salesTimeseries,
} = require("../controllers/analyticsController");

router.get("/best-sellers", protect, admin, bestSellers);
router.get("/region-sales", protect, admin, regionSales);
router.get("/sales-timeseries", protect, admin, salesTimeseries);

module.exports = router;
