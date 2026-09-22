// Multi-Source Trending Data Sources for Tech AI Zone
module.exports = {
  // Reddit Tech Subreddits (Direct JSON feed with user-agent)
  subreddits: [
    { name: 'technology', weight: 1.0, category: 'Tech News' },
    { name: 'artificial', weight: 1.2, category: 'Artificial Intelligence' },
    { name: 'singularity', weight: 1.3, category: 'Breakthrough AI' },
    { name: 'gadgets', weight: 0.9, category: 'Next-Gen Hardware' },
    { name: 'hardware', weight: 1.0, category: 'Next-Gen Hardware' },
    { name: 'iphone', weight: 0.9, category: 'Next-Gen Hardware' },
    { name: 'android', weight: 0.9, category: 'Next-Gen Hardware' },
    { name: 'electricvehicles', weight: 1.0, category: 'Next-Gen Hardware' },
    { name: 'Futurology', weight: 1.0, category: 'Breakthrough AI' },
    { name: 'openai', weight: 1.2, category: 'AI Tools' },
    { name: 'MachineLearning', weight: 1.1, category: 'Deep Tech' }
  ],

  // Hacker News Firebase API
  hackerNews: {
    topStoriesUrl: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    itemUrl: 'https://hacker-news.firebaseio.com/v0/item/',
    limit: 25
  },

  // Google Trends RSS Feeds (Real-time searches)
  googleTrends: [
    { url: 'https://trends.google.com/trends/trending/rss?geo=US', region: 'US' },
    { url: 'https://trends.google.com/trends/trending/rss?geo=GB', region: 'UK' },
    { url: 'https://trends.google.com/trends/trending/rss?geo=CA', region: 'CA' },
    { url: 'https://trends.google.com/trends/trending/rss?geo=AU', region: 'AU' },
    { url: 'https://trends.google.com/trends/trending/rss?geo=IN', region: 'IN' }
  ],

  // Tech & AI Industry RSS Feeds
  rssFeeds: [
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'AI Tools' },
    { name: 'The Verge Tech', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech News' },
    { name: 'TechRadar', url: 'https://www.techradar.com/rss', category: 'Next-Gen Hardware' },
    { name: 'Electrek', url: 'https://electrek.co/feed/', category: 'Next-Gen Hardware' },
    { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'Next-Gen Hardware' },
    { name: 'Wired Science', url: 'https://www.wired.com/feed/category/science/latest/rss', category: 'Deep Tech' },
    { name: 'Wired Business', url: 'https://www.wired.com/feed/category/business/latest/rss', category: 'Tech News' },
    { name: 'The Guardian Technology', url: 'https://www.theguardian.com/uk/technology/rss', category: 'Tech News' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Deep Tech' },
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'Breakthrough AI' }
  ],

  // GitHub Trending Repositories (AI/ML)
  githubTrending: {
    url: 'https://api.github.com/search/repositories?q=stars:>100+topic:ai+pushed:>2025-01-01&sort=stars&order=desc&per_page=15'
  }
};
