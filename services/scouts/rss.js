const axios = require('axios');
const cheerio = require('cheerio');
const sourcesConfig = require('../../config/sources');
const db = require('../../database/db');

class RssScout {
  async fetchTrending() {
    const topics = [];

    for (const feed of sourcesConfig.rssFeeds) {
      try {
        const res = await axios.get(feed.url, {
          headers: { 'User-Agent': 'TechAIZone-Bot/1.0' },
          timeout: 10000
        });

        const $ = cheerio.load(res.data, { xmlMode: true });

        $('item, entry').slice(0, 8).each((i, el) => {
          const title = $(el).find('title').first().text().trim();
          const link = $(el).find('link').text().trim() || $(el).find('link').attr('href') || '';
          const pubDate = $(el).find('pubDate, published, updated').first().text().trim();
          const description = $(el).find('description, content, summary').first().text().trim();

          // Image discovery
          let imageUrl = null;
          const mediaContent = $(el).find('media\\:content, content').attr('url');
          const enclosure = $(el).find('enclosure[type^="image"]').attr('url');
          if (mediaContent) imageUrl = mediaContent;
          else if (enclosure) imageUrl = enclosure;

          if (title && link) {
            topics.push({
              title,
              sourceUrl: link,
              externalUrl: link,
              sourceType: 'rss',
              category: feed.category,
              engagementScore: 120, // RSS from tier 1 publication has high baseline quality
              upvotes: 80,
              commentsCount: 20,
              imageUrl,
              publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              rawText: description.replace(/<[^>]*>?/gm, '').slice(0, 1000)
            });
          }
        });
      } catch (err) {
        db.log('warn', 'RssScout', `Failed RSS feed ${feed.name}: ${err.message}`);
      }
    }

    db.log('info', 'RssScout', `Extracted ${topics.length} topics from RSS feeds.`);
    return topics;
  }
}

module.exports = new RssScout();
