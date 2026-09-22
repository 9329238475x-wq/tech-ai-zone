const limits = require('../../config/limits');
const db = require('../../database/db');

class FactChecker {
  checkArticle(articleData, dossier) {
    let factScore = 90;
    const issues = [];

    // 1. Minimum sources check
    if (!dossier.sources || dossier.sources.length < limits.qualityGate.minSourceCount) {
      factScore -= 10;
      issues.push(`Insufficient source count (${dossier.sources?.length || 0})`);
    }

    // 2. Word count / Depth check
    const wordCount = (articleData.content || '').split(/\s+/).length;
    if (wordCount < limits.qualityGate.minWordCount) {
      factScore -= 15;
      issues.push(`Article length too short (${wordCount} words)`);
    }

    // 3. Claims verification check
    const verifiedClaims = articleData.verified_claims || [];
    if (verifiedClaims.length < 2) {
      factScore -= 5;
      issues.push('Low verified claims count');
    }

    // 4. Vagueness and speculative phrase check
    const vaguePhrases = ['some people say', 'it is believed that', 'rumors suggest without proof'];
    const contentLower = (articleData.content || '').toLowerCase();
    for (const phrase of vaguePhrases) {
      if (contentLower.includes(phrase)) {
        factScore -= 5;
        issues.push(`Vague phrase detected: "${phrase}"`);
      }
    }

    factScore = Math.max(0, Math.min(100, factScore));
    const passed = factScore >= limits.qualityGate.minFactConfidence;

    db.log('info', 'FactChecker', `Fact check result: ${factScore}% confidence. Passed: ${passed}`);

    return {
      passed,
      factScore,
      issues
    };
  }
}

module.exports = new FactChecker();
