// routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  adminAnalyticsOverview,
  adminDemandForecast,
} = require("../controllers/analyticsController");

// GET /api/admin/analytics/overview
router.get("/overview", protect, admin, adminAnalyticsOverview);

// GET /api/admin/analytics/forecasting
router.get("/forecasting", protect, admin, adminDemandForecast);

module.exports = router;
