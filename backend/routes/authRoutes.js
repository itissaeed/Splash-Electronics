const express = require('express');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Import controllers
const {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  login,
  googleLogin,
  getMe,
  updateMe,
  getAdminBootstrapStatus,
  bootstrapAdmin,
} = require('../controllers/authController');
const { forgotPassword, resendPasswordResetOtp, resetPassword } = require('../controllers/passwordController');


// Auth routes
router.post('/signup', signup);
router.post('/signup/verify-otp', verifySignupOtp);
router.post('/signup/resend-otp', resendSignupOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/forgot-password/resend-otp', resendPasswordResetOtp);
router.post('/reset-password', resetPassword);
router.get("/admin-bootstrap-status", getAdminBootstrapStatus);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.post("/bootstrap-admin", protect, bootstrapAdmin);

module.exports = router;
