module.exports = {
  // Topic Scoring Weights
  scoring: {
    weights: {
      trend: 0.25,
      freshness: 0.20,
      searchPotential: 0.20,
      commercialIntent: 0.15,
      sourceQuality: 0.20
    },
    minimumEligibleScore: 65.0
  },

  // 8-Point Automatic Quality Gate Thresholds
  qualityGate: {
    minOriginalityScore: 75,
    minFactConfidence: 75,
    minSourceCount: 3,
    maxDuplicateScore: 20,
    maxSpamScore: 10,
    minCommercialIntent: 30,
    minWordCount: 400,
    maxWordCount: 4500
  },

  // Language Routing Configuration
  languages: [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isDefault: true },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' }
  ],

  // Publishing Schedule
  publishing: {
    maxDailyPosts: 5,
    minDailyPosts: 2,
    defaultCron: '0 8,12,16,20 * * *'
  }
};
