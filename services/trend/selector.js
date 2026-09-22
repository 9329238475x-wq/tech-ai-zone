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

    // Sort by final score descending
    scoredTopics.sort((a, b) => b.finalScore - a.finalScore);

    // Save top 10 into topics_queue if not already stored
    for (const t of scoredTopics.slice(0, 10)) {
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

    db.log('success', 'TopicSelector', `Scored and ranked ${scoredTopics.length} eligible topics. Top score: ${scoredTopics[0]?.finalScore || 0}`);
    return scoredTopics;
  }
}

module.exports = new TopicSelector();
