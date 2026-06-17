function getTopLanguage(repositories) {
  const languageCounts = repositories.reduce((counts, repository) => {
    if (!repository.language) {
      return counts;
    }

    counts[repository.language] = (counts[repository.language] || 0) + 1;
    return counts;
  }, {});

  const [language] = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0] || [];
  return language || null;
}

function getMostStarredRepository(repositories) {
  if (!repositories.length) {
    return null;
  }

  return repositories.reduce((topRepository, repository) => {
    return repository.stargazers_count > topRepository.stargazers_count ? repository : topRepository;
  }, repositories[0]);
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function buildProfileAnalysis(profile, repositories) {
  const sourceRepositories = repositories.filter((repository) => !repository.fork);
  const forkedRepositories = repositories.filter((repository) => repository.fork);
  const totalStars = repositories.reduce((total, repository) => total + repository.stargazers_count, 0);
  const totalForks = repositories.reduce((total, repository) => total + repository.forks_count, 0);
  const mostStarredRepository = getMostStarredRepository(repositories);
  const topRepositories = [...repositories]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((repository) => ({
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      language: repository.language,
      url: repository.html_url
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
    sourceRepositoryCount: sourceRepositories.length,
    forkedRepositoryCount: forkedRepositories.length,
    topLanguage: getTopLanguage(repositories),
    mostStarredRepositoryName: mostStarredRepository?.name || null,
    mostStarredRepositoryStars: mostStarredRepository?.stargazers_count || 0,
    topRepositories
  };
}

module.exports = {
  buildProfileAnalysis
};
