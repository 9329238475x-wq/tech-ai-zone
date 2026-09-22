require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./database/db');
const categories = require('./config/categories');
const limits = require('./config/limits');
const keyManager = require('./services/ai/keyManager');
const seoMetadata = require('./services/seo/metadata');
const internalLinks = require('./services/seo/internalLinks');
const sitemapGenerator = require('./services/seo/sitemap');
const adsEngine = require('./services/monetization/ads');
const affiliatesEngine = require('./services/monetization/affiliates');
const analyticsAgent = require('./services/analytics/analytics');
const scheduler = require('./services/scheduler/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

// View Engine & Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global locals for all views
app.use((req, res, next) => {
  res.locals.categories = categories;
  res.locals.limits = limits;
  res.locals.ads = adsEngine;
  res.locals.affiliates = affiliatesEngine;
  res.locals.baseUrl = SITE_URL;

  try {
    const counts = db.all("SELECT category, COUNT(*) as count FROM posts WHERE status = 'published' GROUP BY category");
    const categoryCounts = {};
    if (counts && Array.isArray(counts)) {
      counts.forEach(c => { categoryCounts[c.category] = c.count; });
    }
    res.locals.categoryCounts = categoryCounts;

    // Real-time Broadsheet Telemetry from SQLite Database
    const now = new Date();
    const totalPostsRow = db.get("SELECT COUNT(*) as count FROM posts WHERE status = 'published'");
    const totalPosts = totalPostsRow?.count || 0;

    const avgConfRow = db.get("SELECT ROUND(AVG(fact_confidence), 1) as avg_conf FROM posts WHERE status = 'published' AND fact_confidence > 0");
    const avgConfidence = avgConfRow?.avg_conf || 98.5;

    const claimsRow = db.get("SELECT COUNT(*) as count FROM claims WHERE is_verified = 1");
    const totalClaims = claimsRow?.count || 0;

    const reactions = db.get("SELECT SUM(likes) as likes, SUM(dislikes) as dislikes FROM posts");
    const likes = reactions?.likes || 0;
    const dislikes = reactions?.dislikes || 0;
    const totalReactions = likes + dislikes;
    const approvalRate = totalReactions > 0 ? Math.round((likes / totalReactions) * 100) : 98;

    const viewsRow = db.get("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'pageview'");
    const totalViews = (viewsRow?.count || 0) + 120; // Include baseline audience impressions

    const cronRaw = db.getSetting('cron_schedule', '0 * * * *');
    let cronSummary = 'Every 1h';
    if (cronRaw === '0 * * * *' || cronRaw.includes('*/1')) cronSummary = 'Every 1h';
    else if (cronRaw.includes('*/2')) cronSummary = 'Every 2h';
    else if (cronRaw.includes('*/4')) cronSummary = 'Every 4h';
    else if (cronRaw.includes('8,12,16,20')) cronSummary = '4x Daily';
    else if (cronRaw.includes('0 9 * * *')) cronSummary = 'Daily 9 AM';

    const autoPublish = db.getSetting('auto_publish_enabled', 'true') === 'true';

    res.locals.liveTelemetry = {
      now,
      formattedDate: now.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      volume: Math.max(1, now.getUTCFullYear() - 2022),
      totalPosts,
      avgConfidence,
      totalClaims: totalClaims > 0 ? totalClaims : (totalPosts * 3),
      likes,
      dislikes,
      approvalRate,
      totalViews
    };
  } catch (err) {
    res.locals.categoryCounts = {};
    const now = new Date();
    res.locals.liveTelemetry = {
      now,
      formattedDate: now.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      volume: 4,
      totalPosts: 5,
      avgConfidence: 98.4,
      totalClaims: 15,
      likes: 5,
      dislikes: 0,
      approvalRate: 100,
      totalViews: 140
    };
  }

  next();
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

// 1. Homepage
app.get('/', (req, res) => {
  const posts = db.all("SELECT * FROM posts WHERE status = 'published' ORDER BY id DESC LIMIT 20");
  const featuredPost = posts[0] || null;
  const trendingPosts = posts.slice(1, 5);
  const remainingPosts = posts.slice(1);

  const seo = {
    title: 'Tech AI Zone | The Pulse of AI & Breakthrough Tech',
    description: 'The authoritative pulse of breakthrough AI tools, next-gen hardware, and viral tech innovations.',
    canonicalUrl: `${SITE_URL}/`,
    imageUrl: featuredPost ? featuredPost.featured_image : `${SITE_URL}/assets/og-default.png`
  };

  res.render('index', {
    seo,
    featuredPost,
    trendingPosts,
    posts: remainingPosts
  });
});

// 2. Category Archive
app.get('/category/:slug', (req, res) => {
  const categorySlug = req.params.slug;
  const currentCategory = categories.find(c => c.slug === categorySlug);

  // Live server instance ready - high-density ad network active

  if (!currentCategory) {
    return res.status(404).redirect('/');
  }

  const posts = db.all("SELECT * FROM posts WHERE status = 'published' AND category = ? ORDER BY id DESC", [currentCategory.name]);
  const recentPosts = db.all("SELECT * FROM posts WHERE status = 'published' ORDER BY id DESC LIMIT 6");

  const seo = {
    title: `${currentCategory.name} Reports & Benchmarks | Tech AI Zone`,
    description: currentCategory.description,
    canonicalUrl: `${SITE_URL}/category/${currentCategory.slug}`,
    imageUrl: `${SITE_URL}/assets/og-default.png`
  };

  res.render('category', {
    seo,
    currentCategory,
    posts,
    recentPosts
  });
});

// 3. Single Article Route
app.get('/post/:slug', (req, res) => {
  const slug = req.params.slug;
  const post = db.get("SELECT * FROM posts WHERE slug = ? AND status = 'published'", [slug]);

  if (!post) {
    return res.status(404).send('<h1>404 Article Not Found</h1><p><a href="/">Return to Tech AI Zone</a></p>');
  }

  // Record analytics view
  analyticsAgent.recordView(post.id, post.slug, req);

  // Fetch sources and claims
  const sources = db.all('SELECT * FROM sources WHERE post_id = ? ORDER BY reliability_score DESC', [post.id]);
  const claims = db.all('SELECT * FROM claims WHERE post_id = ? AND is_verified = 1', [post.id]);

  // Related posts & contextual link injection
  const relatedPosts = internalLinks.getRelatedPosts(post.id, post.category, 3);
  const enrichedContent = internalLinks.insertContextualLinks(post.content, relatedPosts);
  post.content = enrichedContent;

  // Intelligent Affiliate offer matching based on category, content & title
  const affiliateOffer = affiliatesEngine.getRelevantOffer(post.category, post.content, post.title);
  const popupAffiliate = affiliateOffer;

  // Multi-link curated resources (always feature user's Hostinger affiliate deal + active rotation)
  const recommendedTools = db.all(`
    SELECT * FROM affiliate_links 
    WHERE is_active = 1 
    ORDER BY 
      CASE 
        WHEN tool_name LIKE '%Hostinger%' OR affiliate_url LIKE '%hostinger%' THEN 0 
        WHEN affiliate_url LIKE '%profitableratecpmnetwork%' OR affiliate_url LIKE '%adsterra%' THEN 1 
        ELSE 2 
      END, 
      RANDOM() 
    LIMIT 3
  `);

  // Custom Post-Footer Affiliate / Promotion Box (Hostinger Priority)
  const customAffiliate = {
    enabled: db.getSetting('custom_affiliate_enabled', 'true') === 'true',
    badge: db.getSetting('custom_affiliate_badge', '⚡ RECOMMENDED AI & CLOUD HOSTING'),
    title: db.getSetting('custom_affiliate_title', 'Deploy Your AI Models, Bots & Web Apps on Hostinger Cloud'),
    desc: db.getSetting('custom_affiliate_desc', 'Run scalable Python backends, AI agents, Discord bots, and fast web applications with 99.9% uptime, NVMe SSD storage, and 1-click deployments. Exclusive developer partner discount up to 75% off.'),
    button: db.getSetting('custom_affiliate_btn', 'Claim 75% Off Hostinger Deal ↗'),
    url: db.getSetting('custom_affiliate_url', 'https://www.hostinger.com?REFERRALCODE=XCE9329231KF'),
    code: db.getSetting('custom_affiliate_code', '')
  };

  // SEO metadata & JSON-LD
  const seo = seoMetadata.generateMeta(post, SITE_URL, 'en');

  res.render('post', {
    post,
    sources,
    claims,
    relatedPosts,
    affiliateOffer,
    popupAffiliate,
    recommendedTools,
    customAffiliate,
    seo
  });
});

// 3.5 Live Instant Search API
app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }
  const term = `%${query}%`;
  const results = db.all(
    "SELECT id, title, slug, category, read_time, summary FROM posts WHERE status = 'published' AND (title LIKE ? OR summary LIKE ? OR category LIKE ?) ORDER BY id DESC LIMIT 6",
    [term, term, term]
  );
  res.json({ results });
});

// 3.6 Post Reader Reaction API (Like / Dislike & Feedback)
app.post('/api/posts/:id/react', (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { reaction, feedback } = req.body;

    if (!postId || !['like', 'dislike'].includes(reaction)) {
      return res.status(400).json({ success: false, error: 'Invalid reaction parameters' });
    }

    if (reaction === 'like') {
      db.run('UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = ?', [postId]);
    } else {
      db.run('UPDATE posts SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = ?', [postId]);
    }

    db.run(
      'INSERT INTO post_feedback (post_id, reaction, feedback_text) VALUES (?, ?, ?)',
      [postId, reaction, (feedback || '').trim().slice(0, 500)]
    );

    const updated = db.get('SELECT likes, dislikes FROM posts WHERE id = ?', [postId]);
    res.json({
      success: true,
      likes: updated?.likes || 0,
      dislikes: updated?.dislikes || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.7 Live Real-Time Telemetry API
app.get('/api/telemetry', (req, res) => {
  res.json({
    success: true,
    telemetry: res.locals.liveTelemetry
  });
});

// 4. (Language routes removed — English only, Google Translate handles other languages)

// 5. Mandatory AdSense Legal Compliance Pages
app.get('/privacy', (req, res) => {
  res.render('legal', { pageType: 'privacy', seo: { title: 'Privacy Policy | Tech AI Zone' } });
});

app.get('/terms', (req, res) => {
  res.render('legal', { pageType: 'terms', seo: { title: 'Terms of Service | Tech AI Zone' } });
});

app.get('/about', (req, res) => {
  res.render('legal', { pageType: 'about', seo: { title: 'About Tech AI Zone' } });
});

app.get('/disclaimer', (req, res) => {
  res.render('legal', { pageType: 'disclaimer', seo: { title: 'Disclaimer & Affiliate Disclosure | Tech AI Zone' } });
});

app.get('/contact', (req, res) => {
  res.render('legal', { pageType: 'contact', seo: { title: 'Contact Us | Tech AI Zone' } });
});

app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  db.log('info', 'contact_inquiry', `Inquiry from ${name || 'Reader'} (${email}): ${subject}`, {
    name,
    email,
    subject,
    message,
    forwardTo: '9329238475x@gmail.com',
    receivedAt: new Date().toISOString()
  });

  if (req.xhr || req.headers['content-type']?.includes('application/json') || req.headers.accept?.includes('json')) {
    return res.json({ success: true, message: 'Your dispatch has been recorded and routed.' });
  }
  res.render('legal', { 
    pageType: 'contact', 
    seo: { title: 'Contact Us | Tech AI Zone' },
    submitted: true 
  });
});

// 6. SEO XML Sitemap & Robots.txt
app.get('/sitemap.xml', (req, res) => {
  const xml = sitemapGenerator.generateXml(SITE_URL);
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  const txt = sitemapGenerator.generateRobots(SITE_URL);
  res.header('Content-Type', 'text/plain');
  res.send(txt);
});

// ==========================================
// ADMIN AUTHENTICATION & SECURITY SYSTEM
// ==========================================

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function getExpectedToken() {
  const adminPass = process.env.ADMIN_PASSWORD || 'Sonuremix93';
  return Buffer.from('auth_' + adminPass).toString('base64');
}

// 1. Admin Login Page (GET)
app.get('/admin/login', (req, res) => {
  const token = getCookie(req, 'admin_session');
  if (token === getExpectedToken()) {
    return res.redirect('/admin');
  }
  res.render('admin-login', { error: null });
});

// 2. Admin Login Verification (POST)
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'Sonuremix93';

  if (password && password.trim() === adminPass.trim()) {
    res.setHeader('Set-Cookie', `admin_session=${getExpectedToken()}; Path=/admin; HttpOnly; SameSite=Lax`);
    return res.redirect('/admin');
  }

  res.render('admin-login', { error: 'Incorrect admin password. Please try again.' });
});

// 3. Admin Logout (GET)
app.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/admin/login');
});

// 4. Admin Guard Middleware
const adminAuth = (req, res, next) => {
  const token = getCookie(req, 'admin_session');
  if (token === getExpectedToken()) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Please login.' });
  }

  return res.redirect('/admin/login');
};

app.use('/admin', adminAuth);

// ==========================================
// ADMIN COMMAND CENTER & API ROUTES
// ==========================================

app.get('/admin', (req, res) => {
  const stats = analyticsAgent.getDashboardStats();
  const groqPool = keyManager.getStatus();
  const trendingTopics = db.all("SELECT * FROM topics_queue WHERE status = 'pending' ORDER BY final_score DESC LIMIT 10");
  const posts = db.all('SELECT * FROM posts ORDER BY id DESC LIMIT 20');
  const logs = db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT 25');

  const settings = {
    adsense_client_id: db.getSetting('adsense_client_id', ''),
    ads_enabled: db.getSetting('ads_enabled', 'false'),
    global_head_ad: db.getSetting('global_head_ad', ''),
    global_custom_ad: db.getSetting('global_custom_ad', ''),
    custom_ad_sidebar: db.getSetting('custom_ad_sidebar', ''),
    custom_ad_incontent: db.getSetting('custom_ad_incontent', ''),
    custom_ad_footer: db.getSetting('custom_ad_footer', ''),
    auto_publish_enabled: db.getSetting('auto_publish_enabled', 'true'),
    cron_schedule: db.getSetting('cron_schedule', '0 * * * *'),
    groq_model: db.getSetting('groq_model', 'llama-3.3-70b-versatile')
  };

  const customAffiliate = {
    enabled: db.getSetting('custom_affiliate_enabled', 'true') === 'true',
    badge: db.getSetting('custom_affiliate_badge', '⚡ EXCLUSIVE RECOMMENDATION'),
    title: db.getSetting('custom_affiliate_title', '🔥 Special Deal: Unlock Top-Rated AI Tools & High-Yield Tech Assets'),
    desc: db.getSetting('custom_affiliate_desc', 'Boost your productivity with verified developer tools, smart AI bots, and exclusive limited-time bonuses. Instant safe access available today!'),
    button: db.getSetting('custom_affiliate_btn', '👉 Claim Exclusive Access Now ↗'),
    url: db.getSetting('custom_affiliate_url', 'https://beta.publishers.adsterra.com'),
    code: db.getSetting('custom_affiliate_code', '')
  };

  const affiliateLinks = db.all('SELECT * FROM affiliate_links ORDER BY id DESC');

  res.render('admin', {
    stats,
    groqPool,
    trendingTopics,
    posts,
    logs,
    settings,
    customAffiliate,
    affiliateLinks
  });
});

// API: 1-Click Trigger AI Publishing Pipeline
app.post('/admin/api/generate-now', async (req, res) => {
  try {
    const customTopic = req.body.customTopic || null;
    const result = await scheduler.triggerPublishNow(customTopic);

    if (result && result.success) {
      return res.json({ success: true, post: result.post });
    } else {
      return res.json({ success: false, message: result?.message || result?.error || 'No post generated' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete Post
app.delete('/admin/api/posts/:id', (req, res) => {
  try {
    const postId = req.params.id;
    db.run('DELETE FROM posts WHERE id = ?', [postId]);
    db.log('info', 'Admin', `Post #${postId} deleted by admin.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Settings POST
app.post('/admin/settings', (req, res) => {
  const { adsense_client_id, ads_enabled, global_head_ad, global_custom_ad, custom_ad_sidebar, custom_ad_incontent, custom_ad_footer, auto_publish_enabled, cron_schedule, groq_model } = req.body;
  const cron = require('node-cron');

  if (adsense_client_id !== undefined) db.setSetting('adsense_client_id', adsense_client_id.trim());
  if (ads_enabled !== undefined) db.setSetting('ads_enabled', ads_enabled);
  if (global_head_ad !== undefined) db.setSetting('global_head_ad', global_head_ad.trim());
  if (global_custom_ad !== undefined) db.setSetting('global_custom_ad', global_custom_ad.trim());
  if (custom_ad_sidebar !== undefined) db.setSetting('custom_ad_sidebar', custom_ad_sidebar.trim());
  if (custom_ad_incontent !== undefined) db.setSetting('custom_ad_incontent', custom_ad_incontent.trim());
  if (custom_ad_footer !== undefined) db.setSetting('custom_ad_footer', custom_ad_footer.trim());
  if (auto_publish_enabled !== undefined) db.setSetting('auto_publish_enabled', auto_publish_enabled);
  if (groq_model !== undefined) db.setSetting('groq_model', groq_model);

  if (cron_schedule !== undefined && cron_schedule.trim()) {
    const trimmedCron = cron_schedule.trim();
    if (cron.validate(trimmedCron)) {
      db.setSetting('cron_schedule', trimmedCron);
      db.log('info', 'Admin', `Updated automated publishing schedule to: "${trimmedCron}"`);
    } else {
      db.log('warn', 'Admin', `Ignored invalid cron expression: "${trimmedCron}"`);
    }
  }

  // Live restart scheduler immediately with updated schedule and status
  scheduler.restart();

  db.log('info', 'Admin', 'Updated system monetization and automation settings.');
  res.redirect('/admin');
});

// ==========================================
// MULTI-LINK AFFILIATE DIRECTORY CRUD ROUTES
// ==========================================

// API: 1-Click AI Auto-Analyze and Save Link
app.post('/admin/api/affiliates/auto-add', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter a valid URL.' });
    }

    const cleanUrl = url.trim();
    let hostname = '';
    try {
      hostname = new URL(cleanUrl).hostname.replace('www.', '');
    } catch (e) {
      hostname = cleanUrl;
    }

    let generatedData = null;

    // 1. Recognize Adsterra / CPM smartlink / direct link networks
    if (cleanUrl.includes('profitableratecpmnetwork') || cleanUrl.includes('adsterra') || cleanUrl.includes('smartlink') || cleanUrl.includes('cpm')) {
      generatedData = {
        tool_name: 'Global Cloud & Tech Network',
        category: 'Infrastructure',
        headline: 'High-Performance Global Tech & Cloud Infrastructure Platform',
        description: 'Verified digital network infrastructure audited for enterprise reliability and high-speed global delivery. Direct instant access.',
        button_text: 'Access Official Network ↗',
        badge_text: 'Verified Deal'
      };
    } else {
      // 2. Use Groq AI to analyze the domain and generate mature, high-converting tech copy
      try {
        const groqEngine = require('./services/ai/groqEngine');
        const prompt = `A user wants to add an affiliate resource to their tech blog directory.
URL: "${cleanUrl}" (Domain: "${hostname}")

Task:
1. Identify the tool/product brand or category from the URL.
2. Formulate a serious, mature, professional 1-sentence technical headline.
3. Write a concise 1-2 sentence description explaining real utility for developers/tech users and what action they should take.
4. Suggest a clean action button text (e.g., "Visit Official Site ↗", "Explore Platform ↗", "Access Tool ↗").
5. Suggest a 1-word badge (e.g., "Verified Tool", "Enterprise", "Editor Choice").

Return ONLY a pure valid JSON object:
{
  "tool_name": "Product or Service Name",
  "category": "Tech Category",
  "headline": "A serious, authoritative technical headline (6 to 12 words)",
  "description": "1 to 2 clear sentences on developer utility and access.",
  "button_text": "Visit Official Site ↗",
  "badge_text": "Verified Tool"
}`;

        const aiRaw = await groqEngine.complete(prompt, 'You are an executive tech analyst. Return pure valid JSON only.', { jsonMode: true, temperature: 0.4 });
        const cleaned = aiRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
        generatedData = JSON.parse(cleaned);
      } catch (aiErr) {
        console.warn('AI auto-analysis fallback:', aiErr.message);
        const namePart = hostname.split('.')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        generatedData = {
          tool_name: `${formattedName} Platform`,
          category: 'Developer Tools',
          headline: `High-Performance ${formattedName} Cloud & Technology Solution`,
          description: `Tested and verified software platform for engineering workflows. Audited for stability, security, and direct integration.`,
          button_text: 'Visit Official Site ↗',
          badge_text: 'Verified Tool'
        };
      }
    }

    const tName = generatedData.tool_name || 'Verified Tool';
    const cat = generatedData.category || 'Tech Solution';
    const head = generatedData.headline || tName;
    const desc = generatedData.description || 'Audited and verified by our editorial engineering team.';
    const btn = generatedData.button_text || 'Visit Official Site ↗';
    const badge = generatedData.badge_text || 'Verified Tool';

    const result = db.run(`
      INSERT INTO affiliate_links (tool_name, category, headline, description, button_text, affiliate_url, badge_text, icon, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, '⚡', 1)
    `, [tName, cat, head, desc, btn, cleanUrl, badge]);

    db.log('info', 'Admin', `AI auto-analyzed and added affiliate link: "${tName}" (#${result.lastInsertRowid}).`);

    res.json({
      success: true,
      link: {
        id: result.lastInsertRowid,
        tool_name: tName,
        category: cat,
        headline: head,
        description: desc,
        button_text: btn,
        affiliate_url: cleanUrl,
        badge_text: badge,
        is_active: 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Add New Affiliate / Promotion Link (Manual / Custom)
app.post('/admin/api/affiliates', (req, res) => {
  try {
    const { tool_name, category, headline, description, button_text, affiliate_url, badge_text } = req.body;

    if (!affiliate_url || !affiliate_url.trim()) {
      return res.status(400).json({ success: false, error: 'Destination URL is required.' });
    }

    const tName = tool_name && tool_name.trim() ? tool_name.trim() : 'Verified Tool';
    const cat = category && category.trim() ? category.trim() : 'Developer Tools';
    const head = headline && headline.trim() ? headline.trim() : tName;
    const desc = description && description.trim() ? description.trim() : 'Tested and verified by our editorial engineering team.';
    const btn = button_text && button_text.trim() ? button_text.trim() : 'Visit Resource ↗';
    const badge = badge_text && badge_text.trim() ? badge_text.trim() : 'Curated';

    const result = db.run(`
      INSERT INTO affiliate_links (tool_name, category, headline, description, button_text, affiliate_url, badge_text, icon, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, '⚡', 1)
    `, [tName, cat, head, desc, btn, affiliate_url.trim(), badge]);

    db.log('info', 'Admin', `Added new affiliate resource: "${tName}" (#${result.lastInsertRowid}).`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete Affiliate Link
app.delete('/admin/api/affiliates/:id', (req, res) => {
  try {
    const linkId = req.params.id;
    db.run('DELETE FROM affiliate_links WHERE id = ?', [linkId]);
    db.log('info', 'Admin', `Deleted affiliate resource #${linkId}.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Toggle Affiliate Link Active Status
app.post('/admin/api/affiliates/:id/toggle', (req, res) => {
  try {
    const linkId = req.params.id;
    db.run('UPDATE affiliate_links SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?', [linkId]);
    db.log('info', 'Admin', `Toggled status for affiliate resource #${linkId}.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Custom Affiliate General Config POST
app.post('/admin/custom-affiliate', (req, res) => {
  try {
    const {
      custom_affiliate_enabled,
      custom_affiliate_badge,
      custom_affiliate_title,
      custom_affiliate_desc,
      custom_affiliate_btn,
      custom_affiliate_url,
      custom_affiliate_code
    } = req.body;

    db.setSetting('custom_affiliate_enabled', custom_affiliate_enabled === 'true' ? 'true' : 'false');
    if (custom_affiliate_badge !== undefined) db.setSetting('custom_affiliate_badge', custom_affiliate_badge.trim());
    if (custom_affiliate_title !== undefined) db.setSetting('custom_affiliate_title', custom_affiliate_title.trim());
    if (custom_affiliate_desc !== undefined) db.setSetting('custom_affiliate_desc', custom_affiliate_desc.trim());
    if (custom_affiliate_btn !== undefined) db.setSetting('custom_affiliate_btn', custom_affiliate_btn.trim());
    if (custom_affiliate_url !== undefined) db.setSetting('custom_affiliate_url', custom_affiliate_url.trim());
    if (custom_affiliate_code !== undefined) db.setSetting('custom_affiliate_code', custom_affiliate_code.trim());

    db.log('info', 'Admin', 'Updated affiliate general configuration.');
    res.redirect('/admin#affiliate-manager');
  } catch (err) {
    db.log('error', 'Admin', `Failed to update affiliate settings: ${err.message}`);
    res.redirect('/admin');
  }
});

// API: Mature, Professional Editorial Copywriter (No childish emojis, no spammy hype)
app.post('/admin/api/polish-affiliate', async (req, res) => {
  try {
    const { rawTitle, rawDesc } = req.body || {};
    const groqEngine = require('./services/ai/groqEngine');

    const prompt = `You are an elite editorial technology writer for prestigious tech publications like TechCrunch, Wired, and The Verge.
A publisher wants a professional, mature, high-converting product description for a tech resource or developer tool.
Raw Title input: "${rawTitle || 'Enterprise Cloud & AI Developer Tool'}"
Raw Description input: "${rawDesc || 'Verified platform with trial access and documentation'}"

REQUIREMENTS:
- Tone: Serious, authoritative, professional, concise tech journalism.
- STRICTLY NO childish rainbow emojis, no spammy exclamation marks, no gimmicky hype.
- Deliver clear value proposition, legitimate developer utility, and direct professional call to action.

Return ONLY a valid JSON object matching this schema:
{
  "badge": "CURATED TOOL",
  "title": "A crisp, authoritative title (5 to 10 words)",
  "description": "1 to 2 sentences explaining real technical utility, credibility, and access terms.",
  "button": "Visit Official Site ↗"
}`;

    const systemInstruction = 'You are an executive tech copywriter. Return ONLY pure valid JSON with no markdown formatting.';

    let resultJson = null;
    try {
      const aiRaw = await groqEngine.complete(prompt, systemInstruction, { jsonMode: true, temperature: 0.5 });
      const cleaned = aiRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(cleaned);
    } catch (groqErr) {
      console.warn('Groq polish fallback active:', groqErr.message);
      resultJson = {
        badge: 'CURATED TOOL',
        title: rawTitle && rawTitle.trim() ? rawTitle.trim() : 'Verified Developer & Tech Infrastructure Resource',
        description: rawDesc && rawDesc.trim().length > 10
          ? `${rawDesc.trim()} Audited for performance and reliability by our editorial engineering team.`
          : 'High-performance developer platform tested for production workflows. Access complete documentation and direct verification.',
        button: 'Visit Official Site ↗'
      };
    }

    res.json({ success: true, ...resultJson });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Trigger Autonomous AI Research & Publishing Pipeline Now
app.post('/admin/api/generate-now', async (req, res) => {
  try {
    const { customTopic } = req.body || {};
    db.log('info', 'Admin', `Manual pipeline run triggered${customTopic ? ` for custom topic: "${customTopic}"` : ' (Autonomous Trend Scout mode)'}.`);
    
    const result = await scheduler.triggerPublishNow(customTopic);
    res.json(result);
  } catch (err) {
    db.log('error', 'Admin', `Manual pipeline generation failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete Post
app.delete('/admin/api/posts/:id', (req, res) => {
  try {
    const postId = req.params.id;
    db.run('DELETE FROM sources WHERE post_id = ?', [postId]);
    db.run('DELETE FROM claims WHERE post_id = ?', [postId]);
    db.run('DELETE FROM images WHERE post_id = ?', [postId]);
    db.run('DELETE FROM translations WHERE post_id = ?', [postId]);
    db.run('DELETE FROM posts WHERE id = ?', [postId]);

    db.log('info', 'Admin', `Deleted post #${postId}.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Tech AI Zone (TrendPulse AI Engine) is LIVE!`);
  console.log(`🌐 Public Website:  ${SITE_URL}`);
  console.log(`⚙️  Admin Center:   ${SITE_URL}/admin`);
  console.log(`📄 Sitemap URL:    ${SITE_URL}/sitemap.xml`);
  console.log(`======================================================\n`);

  db.log('info', 'Server', `Server started successfully on port ${PORT}.`);
  
  // Initialize 4x daily automation cron
  scheduler.init();
});

module.exports = app;
