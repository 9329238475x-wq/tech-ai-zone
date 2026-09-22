const db = require('../../database/db');

class InternalLinksEngine {
  getRelatedPosts(currentPostId, category, limit = 3) {
    // 1. Try to find same-category posts
    let posts = db.all(`
      SELECT id, title, slug, category, featured_image, read_time, created_at
      FROM posts
      WHERE status = 'published' AND id != ? AND category = ?
      ORDER BY id DESC
      LIMIT ?
    `, [currentPostId, category, limit]);

    // 2. If fewer than limit, backfill with recent published posts
    if (posts.length < limit) {
      const remaining = limit - posts.length;
      const excludeIds = [currentPostId, ...posts.map(p => p.id)];
      const placeholders = excludeIds.map(() => '?').join(',');
      
      const extraPosts = db.all(`
        SELECT id, title, slug, category, featured_image, read_time, created_at
        FROM posts
        WHERE status = 'published' AND id NOT IN (${placeholders})
        ORDER BY id DESC
        LIMIT ?
      `, [...excludeIds, remaining]);

      posts = [...posts, ...extraPosts];
    }

    return posts;
  }

  insertContextualLinks(content, relatedPosts) {
    if (!relatedPosts || relatedPosts.length === 0) return content;

    // Inject a curated contextual recommendation box in the middle of the article
    const recommendationBox = `
      <div class="in-content-recommendation">
        <span class="rec-tag">📖 READ NEXT</span>
        <a href="/post/${relatedPosts[0].slug}" class="rec-link">
          <strong>${relatedPosts[0].title}</strong>
        </a>
      </div>
    `;

    const paragraphs = content.split('</p>');
    if (paragraphs.length > 4) {
      paragraphs.splice(3, 0, recommendationBox);
      return paragraphs.join('</p>');
    }

    return content + recommendationBox;
  }
}

module.exports = new InternalLinksEngine();
