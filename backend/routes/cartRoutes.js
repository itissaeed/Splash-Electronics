const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getMyCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
  clearMyCart,
} = require("../controllers/cartController");

router.get("/", protect, getMyCart);
router.post("/items", protect, addToCart);
router.put("/items/:itemId", protect, updateCartItemQty);
router.delete("/items/:itemId", protect, removeCartItem);
router.delete("/", protect, clearMyCart);

module.exports = router;
