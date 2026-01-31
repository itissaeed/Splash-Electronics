const express = require('express');
const router = express.Router();

// Import controllers
const { signup, login } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');


// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;