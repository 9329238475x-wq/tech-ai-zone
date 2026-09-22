require('dotenv').config();
const db = require('../../database/db');

class GroqKeyManager {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.keyCooldowns = new Map(); // key -> cooldown until timestamp
    this.keyStats = new Map(); // key -> { calls: 0, errors: 0, rateLimits: 0, lastUsed: null }
    this.reloadKeys();
  }

  reloadKeys() {
    const rawKeys = process.env.GROQ_API_KEYS || db.getSetting('groq_api_keys', '') || '';
    this.keys = rawKeys
      .split(',')
      .map(k => k.trim())
      .filter(k => k && k.startsWith('gsk_'));

    this.currentIndex = 0;
    
    // Initialize stats for each key
    for (const key of this.keys) {
      if (!this.keyStats.has(key)) {
        this.keyStats.set(key, { calls: 0, errors: 0, rateLimits: 0, lastUsed: null });
      }
    }

    db.log('info', 'KeyManager', `Loaded ${this.keys.length} Groq API keys into the active rotation pool.`);
    return this.keys.length;
  }

  getActiveKey() {
    if (this.keys.length === 0) {
      this.reloadKeys();
    }

    if (this.keys.length === 0) {
      return null;
    }

    const now = Date.now();
    const startIndex = this.currentIndex;

    // Look for next non-cooldown key
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (startIndex + i) % this.keys.length;
      const key = this.keys[idx];
      const cooldownUntil = this.keyCooldowns.get(key) || 0;

      if (now > cooldownUntil) {
        this.currentIndex = (idx + 1) % this.keys.length;
        const stats = this.keyStats.get(key);
        if (stats) {
          stats.calls++;
          stats.lastUsed = new Date().toISOString();
        }
        return key;
      }
    }

    // If all keys are in cooldown, pick the one that expires earliest
    let earliestKey = this.keys[0];
    let earliestTime = this.keyCooldowns.get(earliestKey) || 0;
    for (const key of this.keys) {
      const cd = this.keyCooldowns.get(key) || 0;
      if (cd < earliestTime) {
        earliestTime = cd;
        earliestKey = key;
      }
    }

    return earliestKey;
  }

  reportRateLimit(key) {
    const cooldownMs = 60 * 1000; // 60s cooldown for 429
    this.keyCooldowns.set(key, Date.now() + cooldownMs);
    
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.rateLimits++;
      stats.errors++;
    }

    const maskedKey = key.slice(0, 8) + '...' + key.slice(-4);
    db.log('warn', 'KeyManager', `Rate limit 429 encountered on key ${maskedKey}. Rotated to next key, 60s cooldown applied.`);
    console.warn(`[KeyManager] Key ${maskedKey} rate-limited. Auto-switched to next key in rotation pool.`);
  }

  reportSuccess(key) {
    // Clear cooldown if it was set
    this.keyCooldowns.delete(key);
  }

  getStatus() {
    const now = Date.now();
    const keyDetails = this.keys.map((k, index) => {
      const masked = k.slice(0, 8) + '...' + k.slice(-4);
      const cd = this.keyCooldowns.get(k) || 0;
      const isCoolingDown = now < cd;
      const stats = this.keyStats.get(k) || { calls: 0, errors: 0, rateLimits: 0 };

      return {
        index: index + 1,
        maskedKey: masked,
        status: isCoolingDown ? `Cooling down (${Math.ceil((cd - now) / 1000)}s)` : 'Active 🟢',
        calls: stats.calls,
        rateLimits: stats.rateLimits,
        lastUsed: stats.lastUsed
      };
    });

    return {
      totalKeys: this.keys.length,
      availableKeys: this.keys.filter(k => (this.keyCooldowns.get(k) || 0) <= now).length,
      poolHealth: this.keys.length > 0 ? 'Healthy' : 'No keys configured',
      keys: keyDetails
    };
  }
}

module.exports = new GroqKeyManager();
