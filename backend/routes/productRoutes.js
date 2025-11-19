const express = require('express');
const router = express.Router();
const multer = require('multer');
const {protect, admin} = require('../middleware/authMiddleware');

// Import controllers
const {
    getProducts,
    getProductsById,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    deleteProductImage,
} = require('../controllers/product');

const { protect, admin } = require('../middleware/authMiddleware');

// Configure Multer
const storage = multer.memoryStorage(); // store file in memory
const upload = multer({ storage });

// Product CRUD routes
router.route('/')
    .get(getProducts)
    .post(protect, admin, createProduct);

router.route('/:id')
    .get(getProductsById)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);

// Image upload route
router.route('/:id/images')
    .post(protect, admin, upload.single('image'), uploadProductImage)
    .delete(protect, admin, deleteProductImage);

module.exports = router;
