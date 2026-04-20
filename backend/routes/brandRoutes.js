const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  getBrands,
  adminLookupBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");

// public
router.get("/", getBrands);
router.get("/admin/lookups", protect, admin, adminLookupBrands);

// admin
router.post("/", protect, admin, createBrand);
router.put("/:id", protect, admin, updateBrand);
router.delete("/:id", protect, admin, deleteBrand);

module.exports = router;
