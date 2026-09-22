const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tech_ai_zone.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Schema
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Database Helper Methods
const dbHelper = {
  db,

  all(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    } catch (err) {
      console.error('DB all error:', err.message, 'SQL:', sql);
      return [];
    }
  },

  get(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.get(...params);
    } catch (err) {
      console.error('DB get error:', err.message, 'SQL:', sql);
      return null;
    }
  },

  run(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.run(...params);
    } catch (err) {
      console.error('DB run error:', err.message, 'SQL:', sql);
      throw err;
    }
  },

  log(level, module, message, details = '') {
    try {
      const stmt = db.prepare(`
        INSERT INTO system_logs (level, module, message, details)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(level, module, message, typeof details === 'object' ? JSON.stringify(details) : String(details));
    } catch (e) {
      console.error('Failed to log to DB:', e.message);
    }
  },

  getSetting(key, defaultValue = null) {
    const row = this.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  },

  setSetting(key, value) {
    this.run(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `, [key, String(value)]);
  }
};

// Seed default settings and initial affiliates if empty
function seedDefaults() {
  const postCount = dbHelper.get('SELECT COUNT(*) as count FROM posts');
  
  // Default Settings
  if (!dbHelper.getSetting('site_name')) {
    dbHelper.setSetting('site_name', 'Tech AI Zone');
    dbHelper.setSetting('site_tagline', 'The Leading Pulse of AI Innovations & Viral Tech');
    dbHelper.setSetting('groq_model', 'llama-3.3-70b-versatile');
    dbHelper.setSetting('ads_enabled', 'true');
    dbHelper.setSetting('adsense_client_id', '');
    dbHelper.setSetting('auto_publish_enabled', 'true');
    dbHelper.setSetting('cron_schedule', '0 * * * *');
  }

  // Default Custom Post Footer Affiliate Promo Settings
  if (!dbHelper.getSetting('custom_affiliate_title')) {
    dbHelper.setSetting('custom_affiliate_enabled', 'true');
    dbHelper.setSetting('custom_affiliate_badge', '⚡ EXCLUSIVE RECOMMENDATION');
    dbHelper.setSetting('custom_affiliate_title', '🔥 Special Deal: Unlock Top-Rated AI Tools & High-Yield Tech Assets');
    dbHelper.setSetting('custom_affiliate_desc', 'Boost your productivity with verified developer tools, smart AI bots, and exclusive limited-time bonuses. Instant safe access available today!');
    dbHelper.setSetting('custom_affiliate_btn', '👉 Claim Exclusive Access Now ↗');
    dbHelper.setSetting('custom_affiliate_url', 'https://beta.publishers.adsterra.com');
    dbHelper.setSetting('custom_affiliate_code', '');
  }

  // Seed standard AI & Tech affiliate offers if none exist
  const affCount = dbHelper.get('SELECT COUNT(*) as count FROM affiliate_links');
  if (!affCount || affCount.count === 0) {
    const defaultAffiliates = [
      {
        tool_name: 'Cursor AI',
        category: 'AI Tools',
        headline: 'Supercharge Your Code with Cursor AI',
        description: 'The revolutionary AI-powered code editor built on VS Code. Write, refactor, and ship 10x faster.',
        button_text: 'Get Cursor Free',
        affiliate_url: 'https://cursor.com',
        badge_text: 'Editor Choice',
        icon: '💻'
      },
      {
        tool_name: 'Perplexity Pro',
        category: 'AI Research',
        headline: 'Next-Generation Conversational Search',
        description: 'Instant answers cited from live internet sources. Experience the new era of search engines.',
        button_text: 'Explore Perplexity',
        affiliate_url: 'https://perplexity.ai',
        badge_text: 'Trending',
        icon: '🔍'
      },
      {
        tool_name: 'Midjourney & Leonardo AI',
        category: 'Generative Media',
        headline: 'Photorealistic AI Art & Design In Seconds',
        description: 'Transform textual concepts into breathtaking visuals and product mockups for your projects.',
        button_text: 'Start Creating',
        affiliate_url: 'https://leonardo.ai',
        badge_text: 'Top Rated',
        icon: '🎨'
      }
    ];

    for (const aff of defaultAffiliates) {
      dbHelper.run(`
        INSERT INTO affiliate_links (tool_name, category, headline, description, button_text, affiliate_url, badge_text, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [aff.tool_name, aff.category, aff.headline, aff.description, aff.button_text, aff.affiliate_url, aff.badge_text, aff.icon]);
    }
  }
}

seedDefaults();

module.exports = dbHelper;
