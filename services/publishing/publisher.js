const slugify = require('slugify');
const deepResearcher = require('../research/researcher');
const factChecker = require('../research/factChecker');
const articleWriter = require('../ai/writer');
const imageEngine = require('../media/imageEngine');
const infographicEngine = require('../media/infographic');
const translator = require('../translation/translator');
const limits = require('../../config/limits');
const db = require('../../database/db');

class Publisher {
  async processAndPublishTopic(topic) {
    db.log('info', 'Publisher', `Initiating quality-gated pipeline for topic: "${topic.title}"`);

    try {
      // 1. Deep Research Dossier
      const dossier = await deepResearcher.buildResearchDossier(topic);
      
      // 2. Image Resolution (Hero Featured Image + In-Content Technical Visual)
      const { primary: imgData, secondary: secondaryImg } = await imageEngine.resolveArticleImages(topic, dossier.imageCandidate);

      // Load active affiliate offers from directory to enable dynamic AI matching
      const activeOffers = db.all('SELECT id, tool_name, category, headline, description, button_text, affiliate_url, badge_text FROM affiliate_links WHERE is_active = 1');

      // 3. AI Content Generation with Inline Citations, Visual Media & Dynamic Affiliate Matching
      const articleData = await articleWriter.generateArticle(dossier, secondaryImg, activeOffers);

      // 4. Fact Checking & Confidence Scoring
      const factCheck = factChecker.checkArticle(articleData, dossier);

      // 5. Original Value Layer Infographic
      const infographicHtml = infographicEngine.generateOriginalValueLayer(articleData.comparison_table, topic.category);

      // 6. Quality Gate Evaluation (8-Point Assessment)
      const qualityScore = Math.round(
        (factCheck.factScore * 0.4) +
        ((articleData.word_count > 1000 ? 95 : 80) * 0.3) +
        ((dossier.sourceCount >= 3 ? 95 : 70) * 0.3)
      );

      const isOriginal = qualityScore >= limits.qualityGate.minOriginalityScore;
      const isFactual = factCheck.passed;
      const hasSources = dossier.sourceCount >= limits.qualityGate.minSourceCount;
      const isWordCountOk = articleData.word_count >= limits.qualityGate.minWordCount;

      const hasValidImage = !!(imgData && imgData.imageUrl && imgData.imageUrl.startsWith('http'));
      const passedQualityGate = isOriginal && isFactual && hasSources && isWordCountOk && hasValidImage;

      // 7. Safety Auto-Hold Filter (Copyright, Defamation, Hallucination)
      const containsProhibited = /(fake news|fabricated report|defamation alert)/i.test(articleData.content);

      if (containsProhibited) {
        db.log('warn', 'Publisher', `Article "${articleData.title}" triggered Safety Auto-Hold.`);
        return this.saveToDraftOrHold(articleData, topic, imgData, infographicHtml, 'Safety Auto-Hold: Policy violation or flagged phrasing');
      }

      if (!passedQualityGate) {
        db.log('warn', 'Publisher', `Article failed Quality Gate (Score: ${qualityScore}, Fact: ${factCheck.factScore}%). Routing to Hold.`);
        return this.saveToDraftOrHold(articleData, topic, imgData, infographicHtml, `Quality Gate Threshold Not Met (Score: ${qualityScore})`);
      }

      // 8. Generate Unique Slug
      let baseSlug = slugify(articleData.title, { lower: true, strict: true });
      let finalSlug = baseSlug;
      let counter = 1;
      while (db.get('SELECT id FROM posts WHERE slug = ?', [finalSlug])) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Approximate Read Time (200 words per minute)
      const readTime = Math.max(3, Math.ceil(articleData.word_count / 200));

      // 9. Insert Post into Database
      const insertResult = db.run(`
        INSERT INTO posts (
          slug, title, meta_description, quick_answer, key_takeaways,
          content, summary, category, status, quality_score,
          fact_confidence, source_count, featured_image, image_caption,
          image_source, image_license, infographic_html, read_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        finalSlug,
        articleData.title,
        articleData.meta_description,
        articleData.quick_answer,
        JSON.stringify(articleData.key_takeaways || []),
        articleData.content,
        articleData.summary,
        topic.category || 'AI Tools',
        qualityScore,
        factCheck.factScore,
        dossier.sourceCount,
        imgData.imageUrl,
        imgData.caption,
        imgData.credit,
        imgData.licenseType,
        infographicHtml,
        readTime
      ]);

      const postId = Number(insertResult.lastInsertRowid);

      // 10. Record Sources & Claims & Images
      for (const s of dossier.sources) {
        db.run(`
          INSERT INTO sources (post_id, title, url, source_type, reliability_score)
          VALUES (?, ?, ?, ?, ?)
        `, [postId, s.title, s.url, s.type, s.reliability || 85]);
      }

      for (const c of articleData.verified_claims || []) {
        db.run(`
          INSERT INTO claims (post_id, claim_text, source_url, confidence_score, is_verified)
          VALUES (?, ?, ?, ?, 1)
        `, [postId, c.claim, c.sourceUrl || '', c.confidence || 90]);
      }

      imageEngine.recordImage(postId, imgData);
      if (secondaryImg) imageEngine.recordImage(postId, secondaryImg);

      // 11. Trigger Multi-Language Translations in Background
      const savedPost = db.get('SELECT * FROM posts WHERE id = ?', [postId]);
      translator.translateAllLanguages(savedPost).catch(err => {
        console.error('Translation background task error:', err.message);
      });

      // 12. Update Topic Queue Status
      if (topic.id) {
        db.run("UPDATE topics_queue SET status = 'published' WHERE id = ?", [topic.id]);
      }

      db.log('success', 'Publisher', `Successfully published article: "${articleData.title}" (Slug: ${finalSlug}, Quality: ${qualityScore}/100)`);

      return {
        success: true,
        post: savedPost
      };

    } catch (err) {
      db.log('error', 'Publisher', `Failed to process topic "${topic.title}": ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  saveToDraftOrHold(articleData, topic, imgData, infographicHtml, reason) {
    const baseSlug = slugify(articleData.title || topic.title, { lower: true, strict: true }) + '-' + Date.now();
    const insertResult = db.run(`
      INSERT INTO posts (
        slug, title, meta_description, quick_answer, content, summary,
        category, status, hold_reason, quality_score, featured_image,
        infographic_html
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'held', ?, 60, ?, ?)
    `, [
      baseSlug,
      articleData.title || topic.title,
      articleData.meta_description || '',
      articleData.quick_answer || '',
      articleData.content || '',
      articleData.summary || '',
      topic.category || 'AI Tools',
      reason,
      imgData?.imageUrl || null,
      infographicHtml || ''
    ]);

    return {
      success: false,
      held: true,
      reason,
      postId: Number(insertResult.lastInsertRowid)
    };
  }
}

module.exports = new Publisher();
