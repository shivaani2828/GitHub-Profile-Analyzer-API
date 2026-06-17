const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const profileRoutes = require("./routes/profile.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GitHub Profile Analyzer API",
    endpoints: {
      health: "GET /health",
      analyze: "POST /api/profiles/analyze",
      allProfiles: "GET /api/profiles",
      singleProfile: "GET /api/profiles/:username"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/profiles", profileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
