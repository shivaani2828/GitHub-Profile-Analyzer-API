const { pool } = require("../config/db");

const profileColumns = `
  github_id,
  username,
  name,
  avatar_url,
  profile_url,
  bio,
  company,
  blog,
  location,
  email,
  twitter_username,
  public_repos,
  public_gists,
  followers,
  following,
  account_created_at,
  github_updated_at,
  total_stars,
  total_forks,
  source_repository_count,
  forked_repository_count,
  top_language,
  most_starred_repository_name,
  most_starred_repository_stars,
  top_repositories
`;

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
  if (!row) {
    return null;
  }

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

async function saveAnalysis(analysis) {
  const values = toDbValues(analysis);
  const placeholders = values.map(() => "?").join(", ");
  const updates = profileColumns
    .split(",")
    .map((column) => column.trim())
    .filter((column) => column !== "github_id")
    .map((column) => `${column} = VALUES(${column})`)
    .join(", ");

  const [result] = await pool.execute(
    `
      INSERT INTO analyzed_profiles (${profileColumns})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updates},
        analyzed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `,
    values
  );

  const profileId = result.insertId || (await findProfileByUsername(analysis.username)).id;
  return findProfileById(profileId);
}

async function findProfiles() {
  const [rows] = await pool.query(`
    SELECT *
    FROM analyzed_profiles
    ORDER BY analyzed_at DESC
  `);

  return rows.map(toApiProfile);
}

async function findProfileByUsername(username) {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM analyzed_profiles
      WHERE LOWER(username) = LOWER(?)
      LIMIT 1
    `,
    [username]
  );

  return toApiProfile(rows[0]);
}

async function findProfileById(id) {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM analyzed_profiles
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return toApiProfile(rows[0]);
}

module.exports = {
  saveAnalysis,
  findProfiles,
  findProfileByUsername
};
