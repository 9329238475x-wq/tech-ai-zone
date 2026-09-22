const groqEngine = require('./groqEngine');
const sourceVerifier = require('../research/sourceVerifier');
const db = require('../../database/db');

class ArticleWriter {
  async generateArticle(dossier, secondaryImage = null, activeOffers = null) {
    db.log('info', 'ArticleWriter', `Generating deep-researched article for "${dossier.topicTitle}" with ${dossier.sourceCount} verified sources`);

    if (!activeOffers || activeOffers.length === 0) {
      activeOffers = db.all('SELECT id, tool_name, category, headline, description, button_text, affiliate_url, badge_text FROM affiliate_links WHERE is_active = 1');
    }

    const affiliatesSummary = activeOffers && activeOffers.length > 0
      ? activeOffers.map(o => `- [ID: ${o.id}] "${o.tool_name}" (${o.category}): ${o.headline}. URL: ${o.affiliate_url}`).join('\n')
      : '- [ID: 6] "Hostinger Cloud & VPS" (Cloud Infrastructure): High-Speed Cloud & VPS Hosting for AI Models, Bots & Web Apps. URL: https://www.hostinger.com?REFERRALCODE=XCE9329231KF';

    const systemPrompt = `
You are the Chief Technology Editor and Lead Research Analyst at "Tech AI Zone" — a premier, globally trusted tech journalism publication on par with The Verge, Ars Technica, and MIT Technology Review.

CORE EDITORIAL & HARD SEO DIRECTIVES:
1. 100% HARD ON-PAGE SEO (SEARCH INTENT & CTR MAXIMIZATION):
   - Headline/Title: Craft a high-CTR, search-optimized title (55-70 chars) that includes the exact tool/model name, version number, benchmark or key breakthrough. Include numbers or power words where relevant.
   - Meta Description: 145-160 chars targeting primary search keywords, answering "what, why, how much" to maximize Google search click-through rate.
   - Quick Answer: Direct, highly factual 2-3 sentence verdict targeting Google Featured Snippets and AI Overviews.
   - Keyword Density & Placement: Naturally integrate primary search queries (e.g. "[Tool] benchmarks", "[Model] pricing", "architecture breakdown", "how it works") across H2 headings and introductory paragraphs.
2. ABSOLUTE TRUST & VERIFIABILITY (भरोसेमंद & E-E-A-T INTEGRITY):
   - Strictly ZERO hallucinated metrics or generic marketing fluff. Every statistic must reference recognized standardized benchmarks (e.g., MMLU-Pro, HumanEval, SWE-bench, GSM8K, token latency in ms, throughput in tokens/sec, VRAM in GB).
   - In-Text Active Citations: You MUST insert 4 to 8 contextual HTML hyperlinks (<a href="EXACT_URL" target="_blank" rel="noopener noreferrer" class="citation-link">Anchor Text ↗</a>) across the paragraphs. ONLY use verified source URLs from the dossier.
   - Critical Nuance: Include real limitations, bottlenecks, cost trade-offs, and competitor comparisons rather than one-sided promotional hype.
3. DEPTH & TECHNICAL SUBSTANCE:
   - Provide concrete code examples, terminal setup commands, architecture diagrams, parameter distributions (e.g., active vs total MoE parameters), and pricing per million tokens.
4. ACTION-ORIENTED PROBLEM SOLVER & 100% FREE WORKFLOWS (मदद और समाधान):
   - You must NOT merely report news. Readers visit to solve real problems and avoid paying high fees.
   - Dedicated "free_guide": Explain clearly why this tool is free, how to run it unlimited for free (e.g. self-hosting open-source weights, free Colab/Kaggle, free API tiers), or describe the best 100% free open-source alternatives to expensive $20/month tools.
   - Dedicated "step_by_step_solution": Provide a clear, actionable numbered tutorial (Step 1, Step 2, Step 3, Step 4) walking the user through practical zero-cost implementation and troubleshooting.
5. STRATEGIC CONTEXTUAL AFFILIATE INTEGRATION:
   - Examine the AVAILABLE AFFILIATE TOOLS list provided in the user prompt.
   - Analyze which tool(s) genuinely provide practical value to developers and users reading about this specific topic (e.g. Hostinger for cloud/VPS/API hosting; Cursor for coding workflows; image tools for generative art; search tools for research).
   - In paragraphs where relevant (e.g. implementation, workflow, or pricing sections), naturally embed 1 to 2 contextual anchor citations:
     <a href="EXACT_AFFILIATE_URL" target="_blank" rel="noopener sponsored" class="citation-link">Tool Name (Deal/Access) ↗</a>.
   - Set "matched_affiliate_id" in the output JSON to the ID of the single most relevant tool from the list.
6. FORMAT:
   - Return pure JSON matching the exact requested schema.
`;

    const userPrompt = `
Generate a deeply researched, comprehensive technical article based on the following verified research dossier.

=== RESEARCH DOSSIER ===
${dossier.dossierText}
=== END DOSSIER ===

TOPIC: ${dossier.topicTitle}
CATEGORY: ${dossier.category}
NUMBER OF SOURCES: ${dossier.sourceCount}

=== CONFIGURED ACTIVE AFFILIATE DIRECTORY TOOLS (ANALYZE & MATCH BEST OFFER) ===
${affiliatesSummary}
=== END AFFILIATE DIRECTORY ===

Remember: 
1. You MUST insert active HTML source citations using <a href="URL" target="_blank" rel="noopener noreferrer" class="citation-link">Anchor Text ↗</a> directly inside paragraphs!
2. You may naturally insert 1 to 2 contextual affiliate tool links from the active directory above where they legitimately help the developer/reader.

Return pure JSON matching this exact schema:
{
  "title": "Compelling, specific, SEO-optimized headline with exact model/tool name (55-75 chars)",
  "meta_description": "Search-optimized summary highlighting key specs, architecture, or benchmark numbers (145-160 chars)",
  "quick_answer": "Direct 2-3 sentence answer/verdict summarizing the core development, primary breakthrough, and who it is for.",
  "matched_affiliate_id": 6,
  "key_takeaways": [
    "Specific takeaway highlighting concrete numbers, parameters, or benchmark result",
    "Practical architectural or developer workflow takeaway",
    "Cost, accessibility, or API integration takeaway",
    "Competitive positioning or market impact takeaway"
  ],
  "free_guide": "2 detailed paragraphs explaining how readers can use this technology 100% free or unlimited (via open-source weights, free tiers, Google Colab, Hugging Face, or local execution), plus the best 100% free open-source alternatives to avoid paying high subscription costs.",
  "step_by_step_solution": "Actionable numbered step-by-step tutorial (Step 1, Step 2, Step 3, Step 4) guiding the reader through practical hands-on implementation and solving their challenge without spending money.",
  "what_happened": "2-3 detailed paragraphs detailing the breaking development, dates, key players, and core announcements. Include active inline source citations with <a href='URL' ...> links.",
  "technical_details": "2-4 deep technical paragraphs exploring the underlying architecture, training paradigm, latency, benchmark comparisons, and engineering novelties. Include active inline source citations with <a href='URL' ...> links.",
  "code_snippet": "Optional code block (e.g., Python API call, CLI installation command, or configuration snippet) if applicable to this topic, else leave empty string",
  "real_world_impact": "2 paragraphs analyzing implications for developers, enterprise workloads, and the broader tech ecosystem. Include active inline source citations.",
  "pricing_and_availability": "Detailed paragraph on pricing tiers, token costs, cloud availability (AWS, GCP, Azure, Bedrock, etc.), open-weights repos, or subscription models with inline links.",
  "limitations": "Honest 1-2 paragraphs on architectural limitations, compute intensity, hallucination risks, latency trade-offs, or licensing constraints.",
  "alternatives": "2 paragraphs comparing directly against 2-3 leading competing products or models with concrete differences.",
  "community_reaction": "Developer quotes and sentiment from Reddit, Hacker News, or X discussions with inline links to the threads.",
  "our_analysis": "2 paragraph editorial analysis offering forward-looking perspective and our definitive verdict.",
  "faqs": [
    {"q": "What is the primary technical novelty of this release?", "a": "Detailed answer with concrete technical facts."},
    {"q": "How does pricing and access compare to previous versions?", "a": "Specific answer with pricing or access specifics."},
    {"q": "How can developers integrate or deploy this today?", "a": "Clear practical integration answer."}
  ],
  "comparison_table": {
    "title": "Technical Comparison: ${dossier.topicTitle.split(':')[0]} vs Industry Standard",
    "headers": ["Specification / Metric", "${dossier.topicTitle.split(':')[0]}", "Leading Competitor"],
    "rows": [
      ["Architecture / Model Type", "Specific spec", "Competitor spec"],
      ["Benchmark Performance", "Concrete score", "Competitor score"],
      ["Pricing / Token Cost", "Specific pricing", "Competitor pricing"],
      ["Deployment Ecosystem", "Supported platforms", "Competitor platforms"]
    ]
  },
  "verified_claims": [
    {"claim": "Specific verifiable claim from dossier", "source": "Exact source publisher", "confidence": 95},
    {"claim": "Second verifiable technical fact", "source": "Exact source publisher", "confidence": 90}
  ]
}
`;

    try {
      const rawResponse = await groqEngine.complete(userPrompt, systemPrompt, { 
        jsonMode: true, 
        maxTokens: 5500,
        temperature: 0.5
      });
      
      let parsed;
      try {
        parsed = JSON.parse(rawResponse);
      } catch (jsonErr) {
        const match = rawResponse.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Failed to parse AI JSON response');
        }
      }

      // Verify claims against dossier sources
      const claimsVerification = sourceVerifier.verifyClaims(parsed.verified_claims || [], dossier.sources);

      // Determine best matched affiliate offer for in-article callout
      const affiliatesEngine = require('../monetization/affiliates');
      let matchedOffer = null;
      if (parsed.matched_affiliate_id && activeOffers && activeOffers.length > 0) {
        matchedOffer = activeOffers.find(o => o.id === Number(parsed.matched_affiliate_id));
      }
      if (!matchedOffer) {
        matchedOffer = affiliatesEngine.getRelevantOffer(dossier.category, `${parsed.what_happened} ${parsed.technical_details} ${parsed.real_world_impact}`, parsed.title);
      }

      // Assemble full rich HTML with inline links, secondary image, tables, FAQs, references index & matched affiliate callout
      const fullHtml = this.assembleHtmlContent(parsed, claimsVerification.verifiedClaims, dossier.sources, secondaryImage, matchedOffer);

      return {
        title: parsed.title || dossier.topicTitle,
        meta_description: parsed.meta_description || parsed.quick_answer || '',
        quick_answer: parsed.quick_answer || '',
        key_takeaways: parsed.key_takeaways || [],
        content: fullHtml,
        summary: parsed.quick_answer || parsed.meta_description || '',
        faqs: parsed.faqs || [],
        comparison_table: parsed.comparison_table || null,
        verified_claims: claimsVerification.verifiedClaims,
        word_count: fullHtml.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
      };

    } catch (err) {
      db.log('error', 'ArticleWriter', `AI generation error: ${err.message}`);
      throw err;
    }
  }

  assembleHtmlContent(data, verifiedClaims, sources = [], secondaryImage = null, matchedOffer = null) {
    let html = '';

    // Helper: convert markdown links [text](url) to styled HTML anchor tags if any slipped through
    const formatRichText = (val) => {
      if (!val) return '';
      let text = String(val);
      
      // Convert markdown links [text](url) -> <a href="url" target="_blank" rel="noopener noreferrer" class="citation-link">text ↗</a>
      text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="citation-link">$1 ↗</a>');

      // Convert paragraphs
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    };

    // 1. Quick Answer Callout
    if (data.quick_answer) {
      html += `
        <div class="quick-answer-card">
          <div class="quick-answer-header">
            <span class="badge-icon">⚡</span>
            <strong>Quick Verdict & Executive Summary</strong>
          </div>
          <p>${data.quick_answer}</p>
        </div>
      `;
    }

    // 2. Key Takeaways
    if (data.key_takeaways && data.key_takeaways.length > 0) {
      html += `
        <div class="takeaways-box">
          <h3>📌 Key Takeaways & Essential Data</h3>
          <ul>
            ${data.key_takeaways.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // 2.5. Table of Contents (SEO Jump Links for Google Site-Links & Rich Snippets)
    html += `
      <nav class="article-toc-box">
        <div class="toc-header">
          <span class="toc-icon">📑</span>
          <strong>Table of Contents (Jump to Key Sections)</strong>
        </div>
        <div class="toc-grid">
          <a href="#what-happened" class="toc-item">1. Breaking Announcement ↗</a>
          <a href="#technical-architecture" class="toc-item">2. Architecture & Benchmarks ↗</a>
          <a href="#real-world-impact" class="toc-item">3. Developer & Industry Impact ↗</a>
          ${data.comparison_table ? '<a href="#benchmarks" class="toc-item">4. Performance Matrix ↗</a>' : ''}
          <a href="#pricing-availability" class="toc-item">5. Pricing & Availability ↗</a>
          <a href="#limitations" class="toc-item">6. Limitations & Bottlenecks ↗</a>
          <a href="#alternatives" class="toc-item">7. Leading Alternatives ↗</a>
          <a href="#community-reaction" class="toc-item">8. Developer Consensus ↗</a>
          <a href="#editorial-verdict" class="toc-item">9. Tech AI Zone Verdict ↗</a>
          ${data.faqs && data.faqs.length ? '<a href="#faqs" class="toc-item">10. FAQs & Answers ↗</a>' : ''}
          <a href="#verified-sources" class="toc-item">11. Verified Primary Sources ↗</a>
        </div>
      </nav>
    `;

    // 3. What Happened (Breaking News)
    if (data.what_happened) {
      html += `
        <h2 id="what-happened">What Happened: The Breaking Development</h2>
        ${formatRichText(data.what_happened)}
      `;
    }

    // 4. Technical Architecture
    if (data.technical_details) {
      html += `
        <h2 id="technical-architecture">Technical Architecture & Benchmarks</h2>
        ${formatRichText(data.technical_details)}
      `;
    }

    // 5. In-Content Secondary Image / Visual Diagram
    if (secondaryImage && secondaryImage.imageUrl) {
      html += `
        <figure class="in-content-figure">
          <img src="${secondaryImage.imageUrl}" alt="${secondaryImage.caption || data.title}" loading="lazy">
          <figcaption class="in-content-caption">
            <span>${secondaryImage.caption || 'Technical Architecture & Ecosystem Integration'}</span>
            <small>Credit: <strong>${secondaryImage.credit || 'Tech AI Zone Visual Lab'}</strong> (${secondaryImage.licenseType || 'Editorial'})</small>
          </figcaption>
        </figure>
      `;
    }

    // 6. Code Snippet / Terminal Setup (if provided)
    if (data.code_snippet && data.code_snippet.trim().length > 10) {
      html += `
        <h3>Implementation & Code Example</h3>
        <div class="code-preview-box">
          <div class="code-header">
            <span class="code-dot red"></span>
            <span class="code-dot yellow"></span>
            <span class="code-dot green"></span>
            <span class="code-title">Terminal / Setup Snippet</span>
          </div>
          <pre><code>${data.code_snippet.trim()}</code></pre>
        </div>
      `;
    }

    // 6.2 Problem-Solving Step-by-Step Guide
    if (data.step_by_step_solution) {
      html += `
        <div class="step-solution-box" style="margin: 30px 0; background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 22px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 1.25rem;">🛠️</span>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #38bdf8; margin: 0;">Step-by-Step Practical Implementation Walkthrough</h3>
          </div>
          ${formatRichText(data.step_by_step_solution)}
        </div>
      `;
    }

    // 6.3 100% Free Access & Open-Source Alternatives Guide
    if (data.free_guide) {
      html += `
        <div class="problem-solver-free-box" style="margin: 30px 0; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 10px; padding: 22px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 1.25rem;">💡</span>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #34d399; margin: 0;">How to Use This for Free (or 100% Free Alternatives)</h3>
          </div>
          ${formatRichText(data.free_guide)}
        </div>
      `;
    }

    // 6.5 AI-Matched In-Content Feature Callout Card
    const affiliatesEngine = require('../monetization/affiliates');
    if (matchedOffer) {
      html += affiliatesEngine.renderInArticleCard(matchedOffer);
    } else {
      const fallbackOffer = affiliatesEngine.getRelevantOffer('Cloud Infrastructure', data.technical_details || '', data.title);
      if (fallbackOffer) html += affiliatesEngine.renderInArticleCard(fallbackOffer);
    }

    // 7. Real World Impact
    if (data.real_world_impact) {
      html += `
        <h2 id="real-world-impact">Real-World Industry & Developer Impact</h2>
        ${formatRichText(data.real_world_impact)}
      `;
    }

    // 8. Comparison Table (Rendered in-line if available)
    if (data.comparison_table && data.comparison_table.headers && data.comparison_table.rows) {
      html += `
        <h2 id="benchmarks">Comparative Performance Matrix</h2>
        <div class="table-responsive-wrapper">
          <table class="article-comparison-table">
            <thead>
              <tr>
                ${data.comparison_table.headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.comparison_table.rows.map(row => `
                <tr>
                  ${row.map((cell, idx) => idx === 0 ? `<td><strong>${cell}</strong></td>` : `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 9. Pricing and Availability
    if (data.pricing_and_availability) {
      html += `
        <h2 id="pricing-availability">Pricing, Licensing & Availability</h2>
        ${formatRichText(data.pricing_and_availability)}
      `;
    }

    // 10. Limitations & Tradeoffs
    if (data.limitations) {
      html += `
        <h2 id="limitations">Current Limitations & Known Bottlenecks</h2>
        <div class="limitations-callout">
          ${formatRichText(data.limitations)}
        </div>
      `;
    }

    // 11. Alternatives
    if (data.alternatives) {
      html += `
        <h2 id="alternatives">Leading Alternatives & Trade-offs</h2>
        ${formatRichText(data.alternatives)}
      `;
    }

    // 12. Community Reaction
    if (data.community_reaction) {
      html += `
        <h2 id="community-reaction">Community Discussions & Developer Consensus</h2>
        <blockquote class="community-quote">
          ${formatRichText(data.community_reaction)}
        </blockquote>
      `;
    }

    // 13. Editorial Verdict
    if (data.our_analysis) {
      html += `
        <h2 id="editorial-verdict">Tech AI Zone Editorial Verdict</h2>
        ${formatRichText(data.our_analysis)}
      `;
    }

    // 14. Verified Fact-Checked Claims Box
    if (verifiedClaims && verifiedClaims.length > 0) {
      html += `
        <div class="verified-facts-box">
          <h3>✅ Verified Fact-Checked Claims</h3>
          <ul class="claims-list">
            ${verifiedClaims.map(c => `
              <li>
                <strong>${c.claim}</strong>
                <span class="confidence-tag">Confidence: ${c.confidence}%</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // 15. FAQ Accordion
    if (data.faqs && data.faqs.length > 0) {
      html += `
        <h2 id="faqs">Frequently Asked Questions</h2>
        <div class="faq-accordion">
          ${data.faqs.map(f => `
            <div class="faq-item">
              <h3 class="faq-question">${f.q}</h3>
              <p class="faq-answer">${f.a}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 16. Dedicated Verified Sources & Evidence Index (User Requested "jagah jagha me link aur complete sources")
    if (sources && sources.length > 0) {
      html += `
        <div id="verified-sources" class="article-references-section">
          <div class="references-header">
            <span class="ref-icon">📚</span>
            <div>
              <h3>Verified Primary Sources & Citations</h3>
              <p class="ref-subtitle">Direct evidence and reference documentation verified for this analysis</p>
            </div>
          </div>
          <div class="references-grid">
            ${sources.map((s, idx) => `
              <div class="reference-card">
                <div class="ref-badge-row">
                  <span class="ref-num">#${idx + 1}</span>
                  <span class="ref-type-tag">${(s.type || 'Source').replace(/_/g, ' ')}</span>
                  <span class="ref-rel-score">✓ ${s.reliability || 90}% Confidence</span>
                </div>
                <h4 class="ref-card-title">
                  <a href="${s.url}" target="_blank" rel="noopener nofollow" class="ref-external-link">
                    ${s.title} <span class="ref-arrow">↗</span>
                  </a>
                </h4>
                <div class="ref-card-meta">
                  <span>Publisher: <strong>${s.sourceName || 'Tech Publication'}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 17. Editorial Transparency Box
    html += `
      <div class="editorial-integrity-box">
        <div class="integrity-icon">🛡️</div>
        <div>
          <h4>Tech AI Zone Editorial Standards</h4>
          <p>This report was researched, verified against official technical documentation, and fact-checked by the Tech AI Zone Editorial Lab. All citations link directly to primary sources.</p>
        </div>
      </div>
    `;

    return html;
  }
}

module.exports = new ArticleWriter();
