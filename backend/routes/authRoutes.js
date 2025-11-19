const express = require('express');
const router = express.Router();

// Import controllers
const { signup } = require('../controllers/userSignup');
const { login } = require('../controllers/userLogin');
const { forgotPassword } = require('../controllers/forgotPassword');
const { resetPassword } = require('../controllers/resetPassword');

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;