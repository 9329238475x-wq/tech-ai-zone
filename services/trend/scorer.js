const limits = require('../../config/limits');

class TopicScorer {
  score(topic) {
    const weights = limits.scoring.weights;

    // 1. Trend Score (Engagement Velocity)
    let trend = Math.min(100, Math.max(30, (topic.engagementScore || 50) / 5));
    if (topic.sourceType === 'reddit' && topic.upvotes > 500) trend = Math.min(100, 75 + (topic.upvotes / 100));

    // 2. Freshness Score
    let freshness = 80;
    if (topic.publishedAt) {
      const hoursAgo = (Date.now() - new Date(topic.publishedAt).getTime()) / (1000 * 60 * 60);
      if (hoursAgo <= 4) freshness = 98;
      else if (hoursAgo <= 8) freshness = 92;
      else if (hoursAgo <= 24) freshness = 82;
      else if (hoursAgo <= 48) freshness = 65;
      else freshness = 45;
    }

    // 3. Search Potential & Problem-Solving Intent (What users search on Google & Reddit)
    const titleLower = topic.title.toLowerCase();
    let search = 60;
    const searchKeywords = [
      'how to', 'guide', 'free', 'unlimited', 'alternative', 'solve', 'setup',
      'step by step', 'without paying', 'open-source', 'review', 'vs', 'benchmark',
      'best', 'features', 'update', 'specs', 'comparison', 'pricing', 'api'
    ];
    for (const kw of searchKeywords) {
      if (titleLower.includes(kw)) search += 8;
    }
    search = Math.min(100, search);

    // 4. Commercial Intent (AdSense RPM & Affiliate potential)
    let commercial = 50;
    const commercialKeywords = ['tool', 'software', 'pricing', 'enterprise', 'hardware', 'subscription', 'gpu', 'cloud', 'developer', 'saas', 'agent', 'automation', 'pro', 'hosting', 'vps'];
    for (const kw of commercialKeywords) {
      if (titleLower.includes(kw)) commercial += 10;
    }
    commercial = Math.min(100, commercial);

    // 4.5 Self-Learning Intelligence Loop (Boost topics based on historical views & likes)
    let learningBonus = 0;
    try {
      const db = require('../../database/db');
      // Find top performing categories by views and positive likes
      const topCategories = db.all(`
        SELECT category, SUM(view_count) as total_views, SUM(likes) as total_likes, SUM(dislikes) as total_dislikes
        FROM posts
        GROUP BY category
        ORDER BY total_views DESC, total_likes DESC
        LIMIT 3
      `);
      if (topCategories && topCategories.some(c => c.category === topic.category && (c.total_likes >= c.total_dislikes))) {
        learningBonus += 8; // Reward proven engaging categories
      }

      // Penalize categories that received high dislike ratio
      const dislikedCategories = db.all(`
        SELECT category FROM posts WHERE dislikes > likes AND dislikes >= 2
      `);
      if (dislikedCategories && dislikedCategories.some(c => c.category === topic.category)) {
        learningBonus -= 12; // Learn from mistakes and avoid unpopular categories
      }
    } catch (e) {
      // Graceful fallback
    }

    // 5. Source Quality Score
    let sourceQuality = 75;
    if (topic.sourceType === 'rss') sourceQuality = 92;
    else if (topic.sourceType === 'hacker_news') sourceQuality = 88;
    else if (topic.sourceType === 'github') sourceQuality = 85;
    else if (topic.sourceType === 'reddit') sourceQuality = 80;
    else if (topic.sourceType === 'google_trends') sourceQuality = 86;

    // Final Weighted Calculation + Self-Learning Intelligence Adjustment
    const baseScore = (
      (trend * weights.trend) +
      (freshness * weights.freshness) +
      (search * weights.searchPotential) +
      (commercial * weights.commercialIntent) +
      (sourceQuality * weights.sourceQuality)
    );

    const finalScore = parseFloat(Math.min(100, Math.max(25, baseScore + learningBonus)).toFixed(1));

    return {
      trendScore: Math.round(trend),
      freshnessScore: Math.round(freshness),
      searchPotential: Math.round(search),
      commercialIntent: Math.round(commercial),
      sourceQuality: Math.round(sourceQuality),
      competitionScore: 50,
      finalScore
    };
  }
}

module.exports = new TopicScorer();
