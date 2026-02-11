const express = require("express");
const router = express.Router();
const { getPublicSettings } = require("../controllers/settingsController");

// Public settings
router.get("/public", getPublicSettings);

module.exports = router;
