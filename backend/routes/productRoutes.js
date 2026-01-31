const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');

const {
  getProducts,
  getProductBySlug,
  getProductById,        // optional helper (if you keep it)
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  getFeaturedProducts,
} = require('../controllers/productController'); // ✅ updated import

// --- multer ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -------------------- ADMIN ROUTES --------------------
router.get('/admin', protect, admin, getAllProductsAdmin);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

// Upload image to a VARIANT
// POST /api/products/:id/images?variantId=xxxx
router.post('/:id/images', protect, admin, upload.single('image'), uploadProductImage);

// Delete image from a VARIANT
// DELETE /api/products/:id/images  body: { variantId, public_id }
router.delete('/:id/images', protect, admin, deleteProductImage);

// -------------------- PUBLIC ROUTES --------------------
router.get('/featured', getFeaturedProducts);

// Optional: support old frontend calling by id
router.get('/id/:id', getProductById);

// List
router.get('/', getProducts);

// Single product by slug (SEO)
router.get('/:slug', getProductBySlug);

module.exports = router;
