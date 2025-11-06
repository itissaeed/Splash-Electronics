const express = require('express');
const router = express.Router();

// Import controllers
const { signup } = require('../controllers/userSignupController');
const { login } = require('../controllers/userLoginController');
const { forgotPassword } = require('../controllers/forgotPasswordController');
const { resetPassword } = require('../controllers/resetPasswordController');

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;