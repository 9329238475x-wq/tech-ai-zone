const axios = require('axios');
const sourcesConfig = require('../../config/sources');
const db = require('../../database/db');

class GithubScout {
  async fetchTrending() {
    const topics = [];
    try {
      const res = await axios.get(sourcesConfig.githubTrending.url, {
        headers: {
          'User-Agent': 'TechAIZone-Scout/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });

      const items = res.data?.items || [];
      for (const repo of items) {
        topics.push({
          title: `${repo.name}: Open Source Breakthrough in ${repo.language || 'AI'}`,
          sourceUrl: repo.html_url,
          externalUrl: repo.html_url,
          sourceType: 'github',
          category: 'Deep Tech',
          engagementScore: (repo.stargazers_count / 100) + (repo.forks_count / 20),
          upvotes: repo.stargazers_count,
          commentsCount: repo.open_issues_count,
          imageUrl: repo.owner?.avatar_url || null,
          publishedAt: repo.updated_at,
          rawText: `${repo.description || ''}. Stars: ${repo.stargazers_count}, Language: ${repo.language}`
        });
      }

      db.log('info', 'GithubScout', `Extracted ${topics.length} open-source repositories.`);
    } catch (err) {
      db.log('warn', 'GithubScout', `GitHub API error: ${err.message}`);
    }

    return topics;
  }
}

module.exports = new GithubScout();
