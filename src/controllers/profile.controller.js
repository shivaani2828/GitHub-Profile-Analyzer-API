const asyncHandler = require("../utils/asyncHandler");
const { fetchGitHubProfile, fetchGitHubRepositories } = require("../services/github.service");
const { buildProfileAnalysis } = require("../services/analysis.service");
const {
  saveAnalysis,
  findProfiles,
  findProfileByUsername
} = require("../repositories/profile.repository");

function normalizeUsername(username) {
  return String(username || "").trim();
}

const analyzeProfile = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username || req.params.username);

  if (!username) {
    res.status(400);
    throw new Error("username is required");
  }

  const [profile, repositories] = await Promise.all([
    fetchGitHubProfile(username),
    fetchGitHubRepositories(username)
  ]);

  const analysis = buildProfileAnalysis(profile, repositories);
  const savedProfile = await saveAnalysis(analysis);

  res.status(201).json({
    success: true,
    message: "GitHub profile analyzed and stored successfully",
    data: savedProfile
  });
});

const getProfiles = asyncHandler(async (req, res) => {
  const profiles = await findProfiles();

  res.json({
    success: true,
    count: profiles.length,
    data: profiles
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const profile = await findProfileByUsername(username);

  if (!profile) {
    res.status(404);
    throw new Error("Analyzed profile not found");
  }

  res.json({
    success: true,
    data: profile
  });
});

module.exports = {
  analyzeProfile,
  getProfiles,
  getProfile
};
