const express = require("express");
const {
  analyzeProfile,
  getProfiles,
  getProfile
} = require("../controllers/profile.controller");

const router = express.Router();

router.post("/analyze", analyzeProfile);
router.post("/:username/analyze", analyzeProfile);
router.get("/", getProfiles);
router.get("/:username", getProfile);

module.exports = router;
