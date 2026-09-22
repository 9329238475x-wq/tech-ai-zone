const axios = require('axios');
const sourcesConfig = require('../../config/sources');
const db = require('../../database/db');

class RedditScout {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TechAIZone/1.0';
  }

  async fetchTrending() {
    const topics = [];

    for (const sub of sourcesConfig.subreddits) {
      try {
        const url = `https://www.reddit.com/r/${sub.name}/hot.json?limit=12`;
        const response = await axios.get(url, {
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000
        });

        const posts = response.data?.data?.children || [];
        for (const item of posts) {
          const p = item.data;
          // Filter out stickied/pinned moderator posts
          if (p.stickied) continue;
          if (p.score < 20) continue; // Minimum engagement threshold

          // Extract best image
          let imageUrl = null;
          if (p.preview?.images?.[0]?.source?.url) {
            imageUrl = p.preview.images[0].source.url.replace(/&amp;/g, '&');
          } else if (p.thumbnail && p.thumbnail.startsWith('http')) {
            imageUrl = p.thumbnail;
          } else if (p.url && (p.url.endsWith('.png') || p.url.endsWith('.jpg') || p.url.endsWith('.jpeg') || p.url.endsWith('.webp'))) {
            imageUrl = p.url;
          }

          topics.push({
            title: p.title,
            sourceUrl: `https://www.reddit.com${p.permalink}`,
            externalUrl: p.url,
            sourceType: 'reddit',
            subreddit: sub.name,
            category: sub.category,
            engagementScore: p.score + (p.num_comments * 2),
            upvotes: p.score,
            commentsCount: p.num_comments,
            imageUrl: imageUrl,
            publishedAt: new Date(p.created_utc * 1000).toISOString(),
            rawText: p.selftext ? p.selftext.slice(0, 1000) : ''
          });
        }
      } catch (err) {
        db.log('warn', 'RedditScout', `Failed to fetch r/${sub.name}: ${err.message}`);
      }
    }

    db.log('info', 'RedditScout', `Extracted ${topics.length} potential topics from Reddit.`);
    return topics;
  }
}

module.exports = new RedditScout();
