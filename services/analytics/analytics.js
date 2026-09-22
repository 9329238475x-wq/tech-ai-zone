const db = require('../../database/db');

class AnalyticsAgent {
  recordView(postId, slug, req) {
    try {
      const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
      const userAgent = (req.headers['user-agent'] || '').slice(0, 200);

      db.run(`
        INSERT INTO analytics (post_id, slug, event_type, referrer, user_agent)
        VALUES (?, ?, 'pageview', ?, ?)
      `, [postId, slug, referrer, userAgent]);

      // Increment view count on post
      db.run('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [postId]);
    } catch (e) {
      // Ignore analytics failures silently
    }
  }

  getDashboardStats() {
    const totalPosts = db.get("SELECT COUNT(*) as count FROM posts WHERE status = 'published'")?.count || 0;
    const totalViews = db.get("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'pageview'")?.count || 0;
    const todayPosts = db.get("SELECT COUNT(*) as count FROM posts WHERE DATE(created_at) = DATE('now')")?.count || 0;
    const pendingTopics = db.get("SELECT COUNT(*) as count FROM topics_queue WHERE status = 'pending'")?.count || 0;

    const topPosts = db.all(`
      SELECT id, title, slug, category, view_count, created_at
      FROM posts
      WHERE status = 'published'
      ORDER BY view_count DESC, id DESC
      LIMIT 5
    `);

    const categoryStats = db.all(`
      SELECT category, COUNT(*) as post_count, SUM(view_count) as total_views
      FROM posts
      WHERE status = 'published'
      GROUP BY category
    `);

    return {
      totalPosts,
      totalViews,
      todayPosts,
      pendingTopics,
      topPosts,
      categoryStats
    };
  }
}

module.exports = new AnalyticsAgent();
