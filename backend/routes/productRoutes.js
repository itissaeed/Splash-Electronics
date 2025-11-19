const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getProducts,
  getProductById,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  getFeaturedProducts,
} = require('../controllers/product');

// --- Configure multer for image upload ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- PUBLIC ROUTES ---
// Get products with pagination & search
router.get('/', getProducts);

// Get featured products
router.get('/featured', getFeaturedProducts);

// Get single product by ID
router.get('/:id', getProductById);

// --- ADMIN ROUTES ---
router.get('/admin', protect, admin, getAllProductsAdmin); // Get all products (no pagination)
router.post('/', protect, admin, createProduct);           // Create product
router.put('/:id', protect, admin, updateProduct);         // Update product
router.delete('/:id', protect, admin, deleteProduct);      // Delete product

// --- ADMIN IMAGE ROUTES ---
router.post('/:id/images', protect, admin, upload.single('image'), uploadProductImage);
router.delete('/:id/images', protect, admin, deleteProductImage);

module.exports = router;
