const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  getInventoryOverview,
  adjustInventory,
} = require("../controllers/inventoryController");

// GET /api/admin/inventory/overview
router.get("/overview", protect, admin, getInventoryOverview);

// POST /api/admin/inventory/adjust
router.post("/adjust", protect, admin, adjustInventory);

module.exports = router;
