// routes/adminSettingsRoutes.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/adminSettingsController");

// GET /api/admin/settings
router.get("/", protect, admin, getAdminSettings);

// PUT /api/admin/settings
router.put("/", protect, admin, updateAdminSettings);

module.exports = router;
