const db = require('../../database/db');

class AffiliatesEngine {
  /**
   * Intelligently selects the most relevant affiliate offer from the database
   * based on article category, title, and body content keywords.
   */
  getRelevantOffer(category = '', content = '', title = '') {
    const activeOffers = db.all('SELECT * FROM affiliate_links WHERE is_active = 1');
    if (!activeOffers || activeOffers.length === 0) return null;
    if (activeOffers.length === 1) return activeOffers[0];

    const textToAnalyze = `${title} ${category} ${content}`.toLowerCase();
    let bestOffer = null;
    let highestScore = -1;

    for (const offer of activeOffers) {
      let score = 0;
      const toolName = (offer.tool_name || '').toLowerCase();
      const offerCat = (offer.category || '').toLowerCase();
      const headline = (offer.headline || '').toLowerCase();
      const desc = (offer.description || '').toLowerCase();

      // 1. Direct Category Matching
      const postCatLower = (category || '').toLowerCase();
      if (postCatLower && offerCat) {
        if (offerCat === postCatLower) {
          score += 45;
        } else if (offerCat.includes(postCatLower) || postCatLower.includes(offerCat)) {
          score += 25;
        }
      }

      // 2. Specialized Semantic Keywords for High-Converting Categories
      if (toolName.includes('hostinger') || offerCat.includes('infra') || offerCat.includes('vps') || offerCat.includes('host')) {
        const infraKeywords = ['deploy', 'hosting', 'host', 'server', 'cloud', 'vps', 'backend', 'api', 'python', 'docker', 'infrastructure', 'run', 'install', 'database', 'uptime', 'compute', 'hardware', 'latency'];
        for (const kw of infraKeywords) {
          if (textToAnalyze.includes(kw)) score += 6;
        }
        score += 15;
      }

      if (toolName.includes('cursor') || offerCat.includes('code') || offerCat.includes('dev')) {
        const codeKeywords = ['code', 'developer', 'vscode', 'ide', 'programming', 'syntax', 'function', 'github', 'repo', 'script', 'refactor', 'terminal'];
        for (const kw of codeKeywords) {
          if (textToAnalyze.includes(kw)) score += 8;
        }
      }

      if (toolName.includes('midjourney') || toolName.includes('leonardo') || offerCat.includes('media') || offerCat.includes('art') || offerCat.includes('image')) {
        const mediaKeywords = ['image', 'art', 'photo', 'visual', 'canvas', 'diffusion', 'prompt', 'video', 'design', 'rendering', 'aesthetic'];
        for (const kw of mediaKeywords) {
          if (textToAnalyze.includes(kw)) score += 10;
        }
      }

      if (toolName.includes('perplexity') || offerCat.includes('research') || offerCat.includes('search')) {
        const searchKeywords = ['search', 'research', 'paper', 'arxiv', 'source', 'citation', 'answer', 'fact', 'benchmark', 'study'];
        for (const kw of searchKeywords) {
          if (textToAnalyze.includes(kw)) score += 8;
        }
      }

      // 3. Keyword Overlap between Offer Headline/Description and Article
      const offerWords = `${toolName} ${headline} ${desc}`.split(/\W+/).filter(w => w.length > 3);
      for (const word of offerWords) {
        if (title && title.toLowerCase().includes(word)) score += 5;
        if (content && content.toLowerCase().includes(word)) score += 1;
      }

      if (score > highestScore) {
        highestScore = score;
        bestOffer = offer;
      }
    }

    return bestOffer || activeOffers[0];
  }

  /**
   * Renders a high-converting in-article feature card for the matched affiliate tool
   */
  renderInArticleCard(offer) {
    if (!offer) return '';

    return `
      <div class="article-sponsor-callout" style="margin: 32px 0; background: #0f172a; border: 1.5px solid #6366f1; border-radius: 12px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <span style="background: linear-gradient(135deg, #7c3aed, #6366f1); color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase;">⚡ ${offer.badge_text || 'Featured Recommendation'}</span>
          <span style="font-size: 0.78rem; color: #c084fc; font-weight: 700;">Category: ${offer.category || 'Developer Solution'}</span>
        </div>
        <h3 style="font-size: 1.18rem; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; line-height: 1.4;">
          ${offer.headline || `Recommended Tool: ${offer.tool_name}`}
        </h3>
        <p style="font-size: 0.9rem; color: #e2e8f0; line-height: 1.6; margin: 0 0 16px 0;">
          ${offer.description}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="font-size: 0.82rem; color: #94a3b8;">
            ✓ Tested and verified by Tech AI Zone editorial team.
          </div>
          <a href="${offer.affiliate_url}" target="_blank" rel="noopener sponsored" style="background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; font-weight: 700; font-size: 0.86rem; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4); transition: transform 0.2s ease;">
            <span>${offer.button_text || 'Explore Tool Now ↗'}</span>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Renders a Google AdSense-compliant Slide-In Recommendation Drawer
   * Non-intrusive bottom-right card with close button
   */
  renderSlideInPopup(offer) {
    if (!offer) return '';

    return `
      <div id="affiliate-slidein-drawer" class="affiliate-slidein-drawer" aria-hidden="true">
        <button id="btn-close-affiliate-drawer" class="drawer-close-btn" aria-label="Close Recommendation">✕</button>
        <div class="drawer-header">
          <span class="drawer-badge">${offer.badge_text || 'Featured Deal'}</span>
          <span class="drawer-category">${offer.category || 'Recommended'}</span>
        </div>
        <div class="drawer-body">
          <h4 class="drawer-title">${offer.tool_name}</h4>
          <p class="drawer-desc">${offer.headline || offer.description}</p>
        </div>
        <div class="drawer-action">
          <a href="${offer.affiliate_url}" target="_blank" rel="noopener sponsored" class="drawer-cta-btn">
            <span>${offer.button_text || 'Claim Offer ↗'}</span>
          </a>
        </div>
      </div>
    `;
  }

  renderAffiliateCard(offer) {
    if (!offer) return '';

    return `
      <div class="affiliate-spotlight-card">
        <div class="affiliate-badge-row">
          <span class="affiliate-badge">${offer.badge_text || 'Featured AI Tool'}</span>
          <span class="affiliate-disclosure">Sponsored Partner</span>
        </div>
        <div class="affiliate-body">
          <div class="affiliate-icon">${offer.icon || '⚡'}</div>
          <div class="affiliate-text">
            <h4>${offer.headline}</h4>
            <p>${offer.description}</p>
          </div>
        </div>
        <div class="affiliate-action">
          <a href="${offer.affiliate_url}" target="_blank" rel="noopener sponsored" class="btn btn-affiliate">
            ${offer.button_text || 'Check It Out'} ↗
          </a>
        </div>
      </div>
    `;
  }
}

module.exports = new AffiliatesEngine();
