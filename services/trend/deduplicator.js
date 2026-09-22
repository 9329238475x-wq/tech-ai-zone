const db = require('../../database/db');

class Deduplicator {
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

  checkDuplicate(candidateTitle) {
    const existingPosts = db.all('SELECT id, title, slug, created_at FROM posts ORDER BY id DESC LIMIT 100');
    
    let maxSimilarity = 0;
    let matchingPost = null;

    for (const p of existingPosts) {
      const sim = this.calculateSimilarity(candidateTitle, p.title);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        matchingPost = p;
      }
    }

    // Also check pending topics queue
    const pendingTopics = db.all("SELECT id, title FROM topics_queue WHERE status IN ('pending', 'processing') LIMIT 50");
    for (const t of pendingTopics) {
      const sim = this.calculateSimilarity(candidateTitle, t.title);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        matchingPost = { id: t.id, title: t.title, isQueueItem: true };
      }
    }

    return {
      isDuplicate: maxSimilarity >= 70,
      similarityScore: Math.round(maxSimilarity),
      existingPost: maxSimilarity >= 70 ? matchingPost : null
    };
  }
}

module.exports = new Deduplicator();
