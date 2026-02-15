const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect, admin } = require("../middleware/authMiddleware");

const {
  getProducts,
  getProductBySlug,
  getProductById,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  getFeaturedProducts,
} = require("../controllers/productController");

// --- multer ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -------------------- ADMIN ROUTES --------------------
router.get("/admin", protect, admin, getAllProductsAdmin);
router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

// ✅ Single upload (keeps your current frontend working)
// POST /api/products/:id/images?variantId=xxxx
router.post("/:id/images", protect, admin, upload.single("image"), uploadProductImage);

// ✅ Multi upload (new endpoint)
// POST /api/products/:id/images/multi?variantId=xxxx
router.post(
  "/:id/images/multi",
  protect,
  admin,
  upload.array("images", 10),
  uploadProductImage
);

// Delete image from a VARIANT
// DELETE /api/products/:id/images  body: { variantId, public_id }
router.delete("/:id/images", protect, admin, deleteProductImage);

// -------------------- PUBLIC ROUTES --------------------
router.get("/featured", getFeaturedProducts);
router.get("/id/:id", getProductById);
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

module.exports = router;
