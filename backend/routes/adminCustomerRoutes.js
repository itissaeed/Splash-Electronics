// routes/adminCustomerRoutes.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { adminGetCustomers } = require("../controllers/customerController");

// GET /api/admin/customers
router.get("/", protect, admin, adminGetCustomers);

module.exports = router;
