const express = require('express');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Import controllers
const { signup, login, getMe, updateMe } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');


// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

module.exports = router;
