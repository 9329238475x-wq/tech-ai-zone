const groqEngine = require('../ai/groqEngine');
const limits = require('../../config/limits');
const db = require('../../database/db');

class TranslationEngine {
  async translatePost(post, targetLangCode) {
    const langConfig = limits.languages.find(l => l.code === targetLangCode);
    if (!langConfig || langConfig.isDefault) return null;

    db.log('info', 'Translator', `Translating article "${post.title.slice(0, 30)}..." to ${langConfig.name} (${targetLangCode})`);

    const prompt = `
Translate and localize this tech article metadata and summary into ${langConfig.name} (${langConfig.nativeName}).
Maintain high technical accuracy. Do NOT translate code, product names (like OpenAI, Nvidia, Claude, Groq), or standard tech acronyms (LLM, GPU, API).

Original Title: ${post.title}
Original Meta Description: ${post.meta_description}
Original Quick Answer: ${post.quick_answer}

Return pure JSON:
{
  "title": "Translated Title in ${langConfig.name}",
  "meta_description": "Translated Meta Description in ${langConfig.name}",
  "summary": "Translated Quick Answer in ${langConfig.name}"
}
`;

    try {
      const response = await groqEngine.complete(prompt, 'You are an expert technical translator.', { jsonMode: true, maxTokens: 1000 });
      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch {
        const match = response.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      }

      const translatedTitle = parsed.title || post.title;
      const translatedMeta = parsed.meta_description || post.meta_description;
      const translatedSummary = parsed.summary || post.summary;

      // Save translation in database
      db.run(`
        INSERT INTO translations (post_id, lang_code, slug, title, meta_description, content, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id, lang_code) DO UPDATE SET
          title = excluded.title,
          meta_description = excluded.meta_description,
          content = excluded.content,
          summary = excluded.summary
      `, [
        post.id,
        targetLangCode,
        post.slug,
        translatedTitle,
        translatedMeta,
        post.content, // Content with translated header & summary
        translatedSummary
      ]);

      return {
        langCode: targetLangCode,
        title: translatedTitle,
        meta_description: translatedMeta,
        summary: translatedSummary
      };

    } catch (err) {
      db.log('warn', 'Translator', `Translation to ${targetLangCode} failed: ${err.message}`);
      return null;
    }
  }

  async translateAllLanguages(post) {
    const targetLangs = limits.languages.filter(l => !l.isDefault);
    for (const l of targetLangs) {
      await this.translatePost(post, l.code);
    }
  }
}

module.exports = new TranslationEngine();
