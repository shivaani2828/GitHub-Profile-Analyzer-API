const axios = require("axios");
const env = require("../config/env");

const githubClient = axios.create({
  baseURL: "https://api.github.com",
  timeout: 15000,
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-profile-analyzer-api",
    ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {})
  }
});

async function fetchGitHubProfile(username) {
  try {
    const response = await githubClient.get(`/users/${encodeURIComponent(username)}`);
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

  try {
    while (page <= 10) {
      const response = await githubClient.get(`/users/${encodeURIComponent(username)}/repos`, {
        params: {
          per_page: perPage,
          page,
          sort: "updated",
          direction: "desc"
        }
      });

      repositories.push(...response.data);

      if (response.data.length < perPage) {
        break;
      }

      page += 1;
    }
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

  return repositories;
}

module.exports = {
  fetchGitHubProfile,
  fetchGitHubRepositories
};
