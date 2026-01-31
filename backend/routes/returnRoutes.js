const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

const {
  requestReturn,
  getMyReturns,
  adminUpdateReturnStatus,
} = require("../controllers/returnRefundController");

router.get("/my", protect, getMyReturns);
router.post("/", protect, requestReturn);
router.put("/admin/:id/status", protect, admin, adminUpdateReturnStatus);

module.exports = router;
