/*
GitHub Profile Analyzer API - Single File Submission

Tech stack:
- Node.js
- Express.js
- MySQL
- GitHub Public API

Install dependencies:
npm init -y
npm install express mysql2 axios dotenv cors helmet
npm install --save-dev nodemon

Create .env file:
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_profile_analyzer
GITHUB_TOKEN=

MySQL schema:

CREATE DATABASE IF NOT EXISTS github_profile_analyzer;
USE github_profile_analyzer;

CREATE TABLE IF NOT EXISTS analyzed_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  github_id BIGINT UNSIGNED NOT NULL,
  username VARCHAR(120) NOT NULL,
  name VARCHAR(255) NULL,
  avatar_url VARCHAR(500) NULL,
  profile_url VARCHAR(500) NOT NULL,
  bio TEXT NULL,
  company VARCHAR(255) NULL,
  blog VARCHAR(500) NULL,
  location VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  twitter_username VARCHAR(255) NULL,
  public_repos INT UNSIGNED NOT NULL DEFAULT 0,
  public_gists INT UNSIGNED NOT NULL DEFAULT 0,
  followers INT UNSIGNED NOT NULL DEFAULT 0,
  following INT UNSIGNED NOT NULL DEFAULT 0,
  account_created_at DATETIME NULL,
  github_updated_at DATETIME NULL,
  total_stars INT UNSIGNED NOT NULL DEFAULT 0,
  total_forks INT UNSIGNED NOT NULL DEFAULT 0,
  source_repository_count INT UNSIGNED NOT NULL DEFAULT 0,
  forked_repository_count INT UNSIGNED NOT NULL DEFAULT 0,
  top_language VARCHAR(120) NULL,
  most_starred_repository_name VARCHAR(255) NULL,
  most_starred_repository_stars INT UNSIGNED NOT NULL DEFAULT 0,
  top_repositories JSON NULL,
  analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_analyzed_profiles_github_id (github_id),
  UNIQUE KEY uq_analyzed_profiles_username (username)
);

Run:
node single-file-submission.js

API endpoints:
GET  /health
POST /api/profiles/analyze       Body: { "username": "octocat" }
POST /api/profiles/:username/analyze
GET  /api/profiles
GET  /api/profiles/:username
*/

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const axios = require("axios");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "github_profile_analyzer",
  waitForConnections: true,
  connectionLimit: 10
});

const github = axios.create({
  baseURL: "https://api.github.com",
  timeout: 15000,
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-profile-analyzer-api",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  }
});

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function getTopLanguage(repositories) {
  const languageCounts = repositories.reduce((counts, repo) => {
    if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1;
    return counts;
  }, {});

  const [language] = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0] || [];
  return language || null;
}

function getMostStarredRepository(repositories) {
  if (!repositories.length) return null;
  return repositories.reduce((top, repo) => {
    return repo.stargazers_count > top.stargazers_count ? repo : top;
  }, repositories[0]);
}

async function fetchGitHubProfile(username) {
  try {
    const response = await github.get(`/users/${encodeURIComponent(username)}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      const notFound = new Error("GitHub user not found");
      notFound.statusCode = 404;
      throw notFound;
    }

    if (error.response?.status === 403) {
      const rateLimit = new Error("GitHub API rate limit exceeded. Add GITHUB_TOKEN to increase the limit.");
      rateLimit.statusCode = 429;
      throw rateLimit;
    }

    throw error;
  }
}

async function fetchGitHubRepositories(username) {
  const repositories = [];
  let page = 1;
  const perPage = 100;

  while (page <= 10) {
    const response = await github.get(`/users/${encodeURIComponent(username)}/repos`, {
      params: {
        per_page: perPage,
        page,
        sort: "updated",
        direction: "desc"
      }
    });

    repositories.push(...response.data);
    if (response.data.length < perPage) break;
    page += 1;
  }

  return repositories;
}

function buildAnalysis(profile, repositories) {
  const sourceRepos = repositories.filter((repo) => !repo.fork);
  const forkedRepos = repositories.filter((repo) => repo.fork);
  const totalStars = repositories.reduce((total, repo) => total + repo.stargazers_count, 0);
  const totalForks = repositories.reduce((total, repo) => total + repo.forks_count, 0);
  const mostStarred = getMostStarredRepository(repositories);

  const topRepositories = [...repositories]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      url: repo.html_url
    }));

  return {
    githubId: profile.id,
    username: profile.login,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    profileUrl: profile.html_url,
    bio: profile.bio,
    company: profile.company,
    blog: profile.blog,
    location: profile.location,
    email: profile.email,
    twitterUsername: profile.twitter_username,
    publicRepos: profile.public_repos,
    publicGists: profile.public_gists,
    followers: profile.followers,
    following: profile.following,
    accountCreatedAt: toDate(profile.created_at),
    githubUpdatedAt: toDate(profile.updated_at),
    totalStars,
    totalForks,
    sourceRepositoryCount: sourceRepos.length,
    forkedRepositoryCount: forkedRepos.length,
    topLanguage: getTopLanguage(repositories),
    mostStarredRepositoryName: mostStarred?.name || null,
    mostStarredRepositoryStars: mostStarred?.stargazers_count || 0,
    topRepositories
  };
}

function toDbValues(analysis) {
  return [
    analysis.githubId,
    analysis.username,
    analysis.name,
    analysis.avatarUrl,
    analysis.profileUrl,
    analysis.bio,
    analysis.company,
    analysis.blog,
    analysis.location,
    analysis.email,
    analysis.twitterUsername,
    analysis.publicRepos,
    analysis.publicGists,
    analysis.followers,
    analysis.following,
    analysis.accountCreatedAt,
    analysis.githubUpdatedAt,
    analysis.totalStars,
    analysis.totalForks,
    analysis.sourceRepositoryCount,
    analysis.forkedRepositoryCount,
    analysis.topLanguage,
    analysis.mostStarredRepositoryName,
    analysis.mostStarredRepositoryStars,
    JSON.stringify(analysis.topRepositories)
  ];
}

function toApiProfile(row) {
  if (!row) return null;

  return {
    id: row.id,
    githubId: row.github_id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatar_url,
    profileUrl: row.profile_url,
    bio: row.bio,
    company: row.company,
    blog: row.blog,
    location: row.location,
    email: row.email,
    twitterUsername: row.twitter_username,
    publicRepos: row.public_repos,
    publicGists: row.public_gists,
    followers: row.followers,
    following: row.following,
    accountCreatedAt: row.account_created_at,
    githubUpdatedAt: row.github_updated_at,
    totalStars: row.total_stars,
    totalForks: row.total_forks,
    sourceRepositoryCount: row.source_repository_count,
    forkedRepositoryCount: row.forked_repository_count,
    topLanguage: row.top_language,
    mostStarredRepositoryName: row.most_starred_repository_name,
    mostStarredRepositoryStars: row.most_starred_repository_stars,
    topRepositories: typeof row.top_repositories === "string" ? JSON.parse(row.top_repositories) : row.top_repositories,
    analyzedAt: row.analyzed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findProfileByUsername(username) {
  const [rows] = await db.execute(
    "SELECT * FROM analyzed_profiles WHERE LOWER(username) = LOWER(?) LIMIT 1",
    [username]
  );

  return toApiProfile(rows[0]);
}

async function saveAnalysis(analysis) {
  const values = toDbValues(analysis);

  await db.execute(
    `
      INSERT INTO analyzed_profiles (
        github_id, username, name, avatar_url, profile_url, bio, company, blog,
        location, email, twitter_username, public_repos, public_gists,
        followers, following, account_created_at, github_updated_at,
        total_stars, total_forks, source_repository_count, forked_repository_count,
        top_language, most_starred_repository_name, most_starred_repository_stars,
        top_repositories
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        name = VALUES(name),
        avatar_url = VALUES(avatar_url),
        profile_url = VALUES(profile_url),
        bio = VALUES(bio),
        company = VALUES(company),
        blog = VALUES(blog),
        location = VALUES(location),
        email = VALUES(email),
        twitter_username = VALUES(twitter_username),
        public_repos = VALUES(public_repos),
        public_gists = VALUES(public_gists),
        followers = VALUES(followers),
        following = VALUES(following),
        account_created_at = VALUES(account_created_at),
        github_updated_at = VALUES(github_updated_at),
        total_stars = VALUES(total_stars),
        total_forks = VALUES(total_forks),
        source_repository_count = VALUES(source_repository_count),
        forked_repository_count = VALUES(forked_repository_count),
        top_language = VALUES(top_language),
        most_starred_repository_name = VALUES(most_starred_repository_name),
        most_starred_repository_stars = VALUES(most_starred_repository_stars),
        top_repositories = VALUES(top_repositories),
        analyzed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `,
    values
  );

  return findProfileByUsername(analysis.username);
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GitHub Profile Analyzer API",
    endpoints: {
      health: "GET /health",
      analyze: "POST /api/profiles/analyze",
      analyzeByParam: "POST /api/profiles/:username/analyze",
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

app.post("/api/profiles/analyze", asyncHandler(async (req, res) => {
  const username = String(req.body.username || "").trim();

  if (!username) {
    res.status(400);
    throw new Error("username is required");
  }

  const [profile, repositories] = await Promise.all([
    fetchGitHubProfile(username),
    fetchGitHubRepositories(username)
  ]);

  const analysis = buildAnalysis(profile, repositories);
  const savedProfile = await saveAnalysis(analysis);

  res.status(201).json({
    success: true,
    message: "GitHub profile analyzed and stored successfully",
    data: savedProfile
  });
}));

app.post("/api/profiles/:username/analyze", asyncHandler(async (req, res) => {
  const username = String(req.params.username || "").trim();

  const [profile, repositories] = await Promise.all([
    fetchGitHubProfile(username),
    fetchGitHubRepositories(username)
  ]);

  const analysis = buildAnalysis(profile, repositories);
  const savedProfile = await saveAnalysis(analysis);

  res.status(201).json({
    success: true,
    message: "GitHub profile analyzed and stored successfully",
    data: savedProfile
  });
}));

app.get("/api/profiles", asyncHandler(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM analyzed_profiles ORDER BY analyzed_at DESC");

  res.json({
    success: true,
    count: rows.length,
    data: rows.map(toApiProfile)
  });
}));

app.get("/api/profiles/:username", asyncHandler(async (req, res) => {
  const profile = await findProfileByUsername(req.params.username);

  if (!profile) {
    res.status(404);
    throw new Error("Analyzed profile not found");
  }

  res.json({
    success: true,
    data: profile
  });
}));

app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

async function startServer() {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();
