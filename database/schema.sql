-- Tech AI Zone / TrendPulse AI Relational Database Schema
-- Built for Node.js native SQLite (node:sqlite)

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  quick_answer TEXT,
  key_takeaways TEXT, -- JSON Array string
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'AI Tools',
  status TEXT NOT NULL DEFAULT 'published', -- 'published', 'draft', 'held', 'archived'
  hold_reason TEXT,
  quality_score REAL DEFAULT 0,
  fact_confidence REAL DEFAULT 0,
  source_count INTEGER DEFAULT 0,
  featured_image TEXT,
  image_caption TEXT,
  image_source TEXT,
  image_license TEXT,
  infographic_html TEXT,
  read_time INTEGER DEFAULT 5,
  view_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  title TEXT,
  url TEXT NOT NULL,
  source_type TEXT, -- 'reddit', 'official_docs', 'news', 'hacker_news', 'github'
  source_date TEXT,
  reliability_score REAL DEFAULT 80,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  claim_text TEXT NOT NULL,
  source_url TEXT,
  confidence_score REAL DEFAULT 85,
  is_verified INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  image_url TEXT NOT NULL,
  source_url TEXT,
  caption TEXT,
  credit TEXT,
  license_type TEXT DEFAULT 'Editorial / Fair Use',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  lang_code TEXT NOT NULL, -- 'hi', 'es', 'fr', 'de', 'ja'
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, lang_code),
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_translations_lang ON translations(lang_code, slug);

CREATE TABLE IF NOT EXISTS topics_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT,
  trend_score REAL DEFAULT 0,
  freshness_score REAL DEFAULT 0,
  search_potential REAL DEFAULT 0,
  commercial_intent REAL DEFAULT 0,
  source_quality REAL DEFAULT 0,
  competition_score REAL DEFAULT 0,
  final_score REAL DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'published', 'rejected', 'held'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  category TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT DEFAULT 'Try Tool Free',
  affiliate_url TEXT NOT NULL,
  badge_text TEXT DEFAULT 'Recommended',
  icon TEXT DEFAULT '⚡',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL, -- 'info', 'warn', 'error', 'success'
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT
);

CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  slug TEXT,
  event_type TEXT DEFAULT 'pageview',
  referrer TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  reaction TEXT NOT NULL, -- 'like' or 'dislike'
  feedback_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

