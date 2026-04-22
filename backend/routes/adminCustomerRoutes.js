// routes/adminCustomerRoutes.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { adminGetCustomers, adminUpdateUserRole } = require("../controllers/customerController");

// GET /api/admin/customers
router.get("/", protect, admin, adminGetCustomers);
router.patch("/:userId/role", protect, admin, adminUpdateUserRole);

module.exports = router;
