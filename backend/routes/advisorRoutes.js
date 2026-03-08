const express = require("express");
const {
  getAdvisorMetadata,
  getAdvisorRecommendations,
} = require("../controllers/advisorController");

const router = express.Router();

router.get("/metadata", getAdvisorMetadata);
router.post("/recommend", getAdvisorRecommendations);

module.exports = router;
