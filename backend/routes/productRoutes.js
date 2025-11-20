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

// -------------------- ADMIN ROUTES --------------------

// Get all products (no pagination)
router.get('/admin', protect, admin, getAllProductsAdmin);

// Create a new product
router.post('/', protect, admin, createProduct);

// Update a product
router.put('/:id', protect, admin, updateProduct);

// Delete a product
router.delete('/:id', protect, admin, deleteProduct);

// Upload a product image
router.post('/:id/images', protect, admin, upload.single('image'), uploadProductImage);

// Delete a product image
router.delete('/:id/images', protect, admin, deleteProductImage);

// -------------------- PUBLIC ROUTES --------------------

// Get featured products (specific route first!)
router.get('/featured', getFeaturedProducts);

// Get all products with pagination & search
router.get('/', getProducts);

// Get single product by ID (dynamic route LAST!)
router.get('/:id', getProductById);

module.exports = router;
