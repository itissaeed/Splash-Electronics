const express = require('express');
const router = express.Router();
const{ protect, admin } = require('../middleware/authMiddleware');
const {getAdminOverview } = require('../controllers/adminController');

router.get('/overview', protect, admin, getAdminOverview);

module.exports = router;