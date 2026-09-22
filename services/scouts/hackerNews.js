const axios = require('axios');
const sourcesConfig = require('../../config/sources');
const db = require('../../database/db');

class HackerNewsScout {
  async fetchTrending() {
    const topics = [];
    try {
      const topIdsRes = await axios.get(sourcesConfig.hackerNews.topStoriesUrl, { timeout: 8000 });
      const topIds = (topIdsRes.data || []).slice(0, sourcesConfig.hackerNews.limit);

      // Fetch top story details in parallel
      const storyPromises = topIds.map(async (id) => {
        try {
          const itemRes = await axios.get(`${sourcesConfig.hackerNews.itemUrl}${id}.json`, { timeout: 5000 });
          return itemRes.data;
        } catch {
          return null;
        }
      });

      const stories = (await Promise.all(storyPromises)).filter(Boolean);

      for (const s of stories) {
        if (!s.title || (s.score && s.score < 30)) continue;

        // Determine category based on keywords
        const lower = s.title.toLowerCase();
        let category = 'Tech News';
        if (lower.includes('ai') || lower.includes('llm') || lower.includes('model') || lower.includes('gpt') || lower.includes('claude') || lower.includes('deepseek')) {
          category = 'AI Tools';
        } else if (lower.includes('chip') || lower.includes('gpu') || lower.includes('hardware') || lower.includes('nvidia') || lower.includes('quantum')) {
          category = 'Next-Gen Hardware';
        }

        topics.push({
          title: s.title,
          sourceUrl: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
          externalUrl: s.url,
          sourceType: 'hacker_news',
          category: category,
          engagementScore: (s.score || 0) * 1.5 + (s.descendants || 0) * 2,
          upvotes: s.score || 0,
          commentsCount: s.descendants || 0,
          imageUrl: null,
          publishedAt: new Date((s.time || Date.now() / 1000) * 1000).toISOString(),
          rawText: ''
        });
      }

      db.log('info', 'HackerNewsScout', `Extracted ${topics.length} topics from HackerNews.`);
    } catch (err) {
      db.log('warn', 'HackerNewsScout', `Failed to fetch HackerNews: ${err.message}`);
    }

    return topics;
  }
}

module.exports = new HackerNewsScout();
