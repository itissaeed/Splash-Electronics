const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  adminListOffers,
  adminCreateOffer,
  adminUpdateOffer,
  adminDeleteOffer,
} = require("../controllers/offerController");

router.get("/", protect, admin, adminListOffers);
router.post("/", protect, admin, adminCreateOffer);
router.put("/:id", protect, admin, adminUpdateOffer);
router.delete("/:id", protect, admin, adminDeleteOffer);

module.exports = router;
