const db = require('../../database/db');

class Deduplicator {
  normalizeTitle(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(text) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'new', 'how', 'what', 'why']);
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }

  calculateSimilarity(textA, textB) {
    const tokensA = new Set(this.tokenize(textA));
    const tokensB = new Set(this.tokenize(textB));

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }

    const union = new Set([...tokensA, ...tokensB]).size;
    return (intersection / union) * 100;
  }

  checkDuplicate(candidateTitle, options = {}) {
    const normalizedCandidate = this.normalizeTitle(candidateTitle);
    const existingPosts = db.all('SELECT id, title, slug, created_at FROM posts ORDER BY id DESC LIMIT 100');
    
    let maxSimilarity = 0;
    let matchingPost = null;

    for (const p of existingPosts) {
      if (normalizedCandidate && normalizedCandidate === this.normalizeTitle(p.title)) {
        return { isDuplicate: true, similarityScore: 100, existingPost: p };
      }
      const sim = this.calculateSimilarity(candidateTitle, p.title);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        matchingPost = p;
      }
    }

    // Also check pending topics queue unless this is the current publish candidate.
    if (!options.ignorePendingQueue) {
      const pendingTopics = db.all("SELECT id, title FROM topics_queue WHERE status IN ('pending', 'processing') LIMIT 50");
      for (const t of pendingTopics) {
        if (options.ignoreQueueId && Number(options.ignoreQueueId) === Number(t.id)) continue;
        if (normalizedCandidate && normalizedCandidate === this.normalizeTitle(t.title)) {
          return { isDuplicate: true, similarityScore: 100, existingPost: { ...t, isQueueItem: true } };
        }
        const sim = this.calculateSimilarity(candidateTitle, t.title);
        if (sim > maxSimilarity) {
          maxSimilarity = sim;
          matchingPost = { id: t.id, title: t.title, isQueueItem: true };
        }
      }
    }

    return {
      isDuplicate: maxSimilarity >= 70,
      similarityScore: Math.round(maxSimilarity),
      existingPost: maxSimilarity >= 70 ? matchingPost : null
    };
  }

  isTitleAlreadyPublished(title) {
    const normalizedTitle = this.normalizeTitle(title);
    if (!normalizedTitle) return false;
    const posts = db.all('SELECT title FROM posts WHERE status IN (\'published\', \'held\')');
    return posts.some(post => this.normalizeTitle(post.title) === normalizedTitle);
  }
}

module.exports = new Deduplicator();
