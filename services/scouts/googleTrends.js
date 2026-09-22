const axios = require('axios');
const cheerio = require('cheerio');
const sourcesConfig = require('../../config/sources');
const db = require('../../database/db');

class GoogleTrendsScout {
  async fetchTrending() {
    const topics = [];

    for (const feed of sourcesConfig.googleTrends) {
      try {
        const res = await axios.get(feed.url, { timeout: 10000 });
        const $ = cheerio.load(res.data, { xmlMode: true });

        $('item').each((i, el) => {
          const title = $(el).find('title').text().trim();
          const traffic = $(el).find('ht\\:approx_traffic, approx_traffic').text().trim();
          const pubDate = $(el).find('pubDate').text().trim();
          const newsTitle = $(el).find('ht\\:news_item_title, news_item_title').first().text().trim();
          const newsUrl = $(el).find('ht\\:news_item_url, news_item_url').first().text().trim();
          const pictureUrl = $(el).find('ht\\:picture, picture').text().trim();

          if (!title) return;

          // Traffic calculation
          let trafficScore = 50;
          if (traffic.includes('100K')) trafficScore = 95;
          else if (traffic.includes('50K')) trafficScore = 85;
          else if (traffic.includes('20K')) trafficScore = 75;
          else if (traffic.includes('10K')) trafficScore = 65;

          topics.push({
            title: newsTitle || `${title} Trending Development`,
            sourceUrl: newsUrl || `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}`,
            externalUrl: newsUrl,
            sourceType: 'google_trends',
            category: 'Tech News',
            engagementScore: trafficScore * 2,
            upvotes: trafficScore * 10,
            commentsCount: 0,
            imageUrl: pictureUrl || null,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            rawText: `Google Trends search volume spike: ${traffic}. Related headline: ${newsTitle}`
          });
        });
      } catch (err) {
        db.log('warn', 'GoogleTrendsScout', `Google Trends RSS error (${feed.region}): ${err.message}`);
      }
    }

    db.log('info', 'GoogleTrendsScout', `Extracted ${topics.length} topics from Google Trends.`);
    return topics;
  }
}

module.exports = new GoogleTrendsScout();
