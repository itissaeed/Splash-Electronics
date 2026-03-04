const express = require("express");
const { getShippingQuoteController } = require("../controllers/shippingController");

const router = express.Router();

router.post("/quote", getShippingQuoteController);

module.exports = router;
