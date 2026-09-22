const redditScout = require('../scouts/reddit');
const hackerNewsScout = require('../scouts/hackerNews');
const googleTrendsScout = require('../scouts/googleTrends');
const rssScout = require('../scouts/rss');
const githubScout = require('../scouts/github');
const scorer = require('./scorer');
const deduplicator = require('./deduplicator');
const limits = require('../../config/limits');
const db = require('../../database/db');

class TopicSelector {
  shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  canonicalCategory(category, title = '') {
    const value = `${category || ''} ${title || ''}`.toLowerCase();
    if (/gadget|phone|iphone|android|laptop|wearable|car|vehicle|robot|chip|gpu|hardware|device/.test(value)) {
      return 'Next-Gen Hardware';
    }
    if (/ai|llm|gpt|claude|model|copilot|agent|machine learning|neural/.test(value)) {
      return 'AI Tools';
    }
    if (/quantum|space|biotech|cyber|open source|science|research/.test(value)) {
      return 'Deep Tech';
    }
    if (category === 'Breakthrough AI' || category === 'Artificial Intelligence') {
      return 'Breakthrough AI';
    }
    return 'Tech News';
  }

  async discoverAndRankTopics() {
    db.log('info', 'TopicSelector', 'Starting multi-source trend scouting across Reddit, HN, Trends, RSS, and GitHub.');
    
    // Run scouts in parallel
    const [redditTopics, hnTopics, trendsTopics, rssTopics, githubTopics] = await Promise.all([
      redditScout.fetchTrending().catch(() => []),
      hackerNewsScout.fetchTrending().catch(() => []),
      googleTrendsScout.fetchTrending().catch(() => []),
      rssScout.fetchTrending().catch(() => []),
      githubScout.fetchTrending().catch(() => [])
    ]);

    const allDiscovered = [
      ...redditTopics,
      ...hnTopics,
      ...trendsTopics,
      ...rssTopics,
      ...githubTopics
    ];

    db.log('info', 'TopicSelector', `Total raw topics collected: ${allDiscovered.length}`);

    const scoredTopics = [];
    const seenTitles = new Set();

    for (const item of allDiscovered) {
      item.category = this.canonicalCategory(item.category, item.title);
      const titleKey = deduplicator.normalizeTitle(item.title);
      if (!titleKey || seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
      if (scoredTopics.some(topic => deduplicator.calculateSimilarity(item.title, topic.title) >= 70)) continue;

      // 1. Deduplication check
      const dupCheck = deduplicator.checkDuplicate(item.title);
      if (dupCheck.isDuplicate) {
        continue; // Skip duplicate intent
      }

      // 2. Score candidate
      const scores = scorer.score(item);
      
      if (scores.finalScore >= limits.scoring.minimumEligibleScore) {
        scoredTopics.push({
          ...item,
          ...scores
        });
      }
    }

    // Randomize category order per cycle, while preserving highest score inside each category.
    const categoryBuckets = new Map();
    for (const topic of scoredTopics) {
      if (!categoryBuckets.has(topic.category)) categoryBuckets.set(topic.category, []);
      categoryBuckets.get(topic.category).push(topic);
    }

    for (const topics of categoryBuckets.values()) {
      topics.sort((a, b) => b.finalScore - a.finalScore);
    }

    const categoryOrder = this.shuffle([...categoryBuckets.keys()]);
    const diverseTopics = [];
    let depth = 0;
    while (diverseTopics.length < scoredTopics.length) {
      let addedAtDepth = false;
      for (const category of categoryOrder) {
        const topic = categoryBuckets.get(category)?.[depth];
        if (topic) {
          diverseTopics.push(topic);
          addedAtDepth = true;
        }
      }
      if (!addedAtDepth) break;
      depth++;
    }

    db.log('info', 'TopicSelector', `Random category order for this cycle: ${categoryOrder.join(', ')}`);

    // Save top 10 into topics_queue if not already stored
    for (const t of diverseTopics.slice(0, 20)) {
      try {
        db.run(`
          INSERT INTO topics_queue (
            title, source_url, source_type, 
            trend_score, freshness_score, search_potential, 
            commercial_intent, source_quality, competition_score, 
            final_score, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
          t.title, t.sourceUrl, t.sourceType,
          t.trendScore, t.freshnessScore, t.searchPotential,
          t.commercialIntent, t.sourceQuality, t.competitionScore,
          t.finalScore
        ]);
      } catch (e) {
        // Ignore duplicate key if any
      }
    }

    db.log('success', 'TopicSelector', `Scored ${scoredTopics.length} eligible topics across ${categoryOrder.length} categories.`);
    return diverseTopics;
  }
}

module.exports = new TopicSelector();
