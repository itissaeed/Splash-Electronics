const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  adminListOffers,
  adminCreateOffer,
  adminUpdateOffer,
  adminDeleteOffer,
  adminLookupOfferProducts,
  adminLookupOfferCategories,
  adminLookupOfferUsers,
} = require("../controllers/offerController");

router.get("/", protect, admin, adminListOffers);
router.get("/lookups/products", protect, admin, adminLookupOfferProducts);
router.get("/lookups/categories", protect, admin, adminLookupOfferCategories);
router.get("/lookups/users", protect, admin, adminLookupOfferUsers);
router.post("/", protect, admin, adminCreateOffer);
router.put("/:id", protect, admin, adminUpdateOffer);
router.delete("/:id", protect, admin, adminDeleteOffer);

module.exports = router;
