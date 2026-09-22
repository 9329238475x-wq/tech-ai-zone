const cron = require('node-cron');
const topicSelector = require('../trend/selector');
const publisher = require('../publishing/publisher');
const db = require('../../database/db');
const deduplicator = require('../trend/deduplicator');

class Scheduler {
  constructor() {
    this.cronTask = null;
    this.isRunningCycle = false;
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      db.log('info', 'Scheduler', 'Previous automation cron task stopped.');
    }
  }

  restart() {
    this.stop();
    this.init();
  }

  init() {
    this.stop();

    const cronExpression = db.getSetting('cron_schedule', '0 8,12,16,20 * * *');
    const autoPublish = db.getSetting('auto_publish_enabled', 'true') === 'true';

    if (!autoPublish) {
      db.log('info', 'Scheduler', 'Auto-publishing is disabled in settings.');
      return;
    }

    if (cron.validate(cronExpression)) {
      this.cronTask = cron.schedule(cronExpression, async () => {
        db.log('info', 'Scheduler', `Cron trigger fired at ${new Date().toLocaleTimeString()}! Initiating publishing cycle.`);
        await this.runAutomatedPublishingCycle();
      });

      db.log('info', 'Scheduler', `Scheduler active with cron pattern: "${cronExpression}".`);
      console.log(`[Scheduler] Automation Cron running: ${cronExpression}`);
    } else {
      db.log('error', 'Scheduler', `Invalid cron expression configured: ${cronExpression}`);
    }
  }

  async runAutomatedPublishingCycle(force = false) {
    if (this.isRunningCycle) {
      console.log('[Scheduler] A publishing cycle is already in progress. Skipping.');
      return { success: false, message: 'Cycle already in progress' };
    }

    this.isRunningCycle = true;
    db.log('info', 'Scheduler', '=== STARTING AUTOMATED RESEARCH & PUBLISHING CYCLE ===');

    try {
      // 1. Discover, score, and rank trending topics across all sources
      const rankedTopics = await topicSelector.discoverAndRankTopics();

      if (!rankedTopics || rankedTopics.length === 0) {
        db.log('warn', 'Scheduler', 'No eligible trending topics exceeded the threshold score this cycle.');
        this.isRunningCycle = false;
        return { success: false, message: 'No eligible topics found' };
      }

      // 2. Publish two posts per cycle, using fallback candidates when quality checks fail.
      const publishedResults = [];
      let candidateIndex = 0;

      while (publishedResults.length < 2 && candidateIndex < rankedTopics.length) {
        const candidate = rankedTopics[candidateIndex++];
        const duplicate = deduplicator.checkDuplicate(candidate.title, { ignorePendingQueue: true });
        if (duplicate.isDuplicate) {
          console.log(`[Scheduler] Skipping duplicate candidate: "${candidate.title}"`);
          continue;
        }
        console.log(`[Scheduler] Attempting candidate: "${candidate.title}" (Score: ${candidate.finalScore})`);
        const result = await publisher.processAndPublishTopic(candidate);

        if (result && result.success) {
          publishedResults.push(result);
          console.log(`[Scheduler] Published ${publishedResults.length}/2 posts this cycle.`);
        } else {
          console.warn('[Scheduler] Candidate failed quality gate or had errors. Trying the next eligible topic.');
        }
      }

      this.isRunningCycle = false;
      return publishedResults.length > 0
        ? { success: true, publishedCount: publishedResults.length, results: publishedResults }
        : { success: false, publishedCount: 0, message: 'Quality gate held candidate posts' };

    } catch (err) {
      this.isRunningCycle = false;
      db.log('error', 'Scheduler', `Publishing cycle encountered an exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async triggerPublishNow(customTopic = null) {
    if (customTopic) {
      const topicObj = {
        title: customTopic,
        sourceUrl: 'https://news.google.com',
        sourceType: 'manual_admin',
        category: 'AI Tools',
        engagementScore: 100,
        upvotes: 100,
        publishedAt: new Date().toISOString()
      };
      return await publisher.processAndPublishTopic(topicObj);
    }

    return await this.runAutomatedPublishingCycle(true);
  }
}

module.exports = new Scheduler();
