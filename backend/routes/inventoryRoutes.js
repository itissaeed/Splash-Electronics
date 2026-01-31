const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  stockIn,
  adjustStock,
  getLedger,
} = require("../controllers/inventoryController");

router.post("/in", protect, admin, stockIn);
router.post("/adjust", protect, admin, adjustStock);
router.get("/ledger", protect, admin, getLedger);

module.exports = router;
