/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Engaged User Segmentation
 * Create user segments based on engagement levels for future targeting
 */

const fs = require('node:fs');
const path = require('node:path');

class UserSegmentation {
  constructor() {
    this.segmentsPath = path.join(__dirname, 'user-segments.json');
    this.engagementLevels = {
      highlyEngaged: 10, // Users who open/click 10 or more times
      moderatelyEngaged: 5, // Users who open/click 5 to 9 times
      slightlyEngaged: 1, // Users who open/click 1 to 4 times
    };

    this.loadSegments();
  }

  /**
   * Load existing segments from file
   */
  loadSegments() {
    if (fs.existsSync(this.segmentsPath)) {
      const data = fs.readFileSync(this.segmentsPath, 'utf8');
      this.segments = JSON.parse(data);
    } else {
      this.segments = {
        highlyEngaged: [],
        moderatelyEngaged: [],
        slightlyEngaged: [],
      };
    }
  }

  /**
   * Save segments to file
   */
  saveSegments() {
    fs.writeFileSync(this.segmentsPath, JSON.stringify(this.segments, null, 2));
    console.log('📁 User segments saved:', this.segmentsPath);
  }

  /**
   * Create segments based on engagement
   */
  createSegments(events) {
    const userEngagement = {};

    // Calculate engagement for each user
    events.forEach(event => {
      const userId = event.userId || event.pixelId || event.id;
      if (!userEngagement[userId]) {
        userEngagement[userId] = { opens: 0, clicks: 0, total: 0 };
      }

      userEngagement[userId].total++;
      switch (event.type) {
        case 'email_open':
          userEngagement[userId].opens++;
          break;
        case 'link_click':
          userEngagement[userId].clicks++;
          break;
      }
    });

    // Reset segments
    this.segments.highlyEngaged.length = 0;
    this.segments.moderatelyEngaged.length = 0;
    this.segments.slightlyEngaged.length = 0;

    // Assign users to segments
    Object.entries(userEngagement).forEach(([userId, engagement]) => {
      if (engagement.total >= this.engagementLevels.highlyEngaged) {
        this.segments.highlyEngaged.push(userId);
      } else if (engagement.total >= this.engagementLevels.moderatelyEngaged) {
        this.segments.moderatelyEngaged.push(userId);
      } else if (engagement.total >= this.engagementLevels.slightlyEngaged) {
        this.segments.slightlyEngaged.push(userId);
      }
    });

    this.saveSegments();

    return this.segments;
  }

  /**
   * Import tracking data and create user segments
   * @param {string} eventLogPath - Path to tracking events log file
   */
  async processTrackingData(eventLogPath) {
    if (!fs.existsSync(eventLogPath)) {
      throw new Error(new Error(new Error('Tracking data file not found at ' + eventLogPath)));
    }

    const events = JSON.parse(fs.readFileSync(eventLogPath, 'utf8'));

    // Generate segments
    const segments = this.createSegments(events);

    console.log('✅ User segmentation completed:', segments);
    return segments;
  }
}

module.exports = UserSegmentation;

// Run segmentation if this file is executed directly
if (require.main === module) {
  const segmenter = new UserSegmentation();
  const trackingDataPath = path.join(__dirname, 'tracking-events.json');

  segmenter
    .processTrackingData(trackingDataPath)
    .then(() => console.log('User segmentation process completed.'))
    .catch(error => console.error('User segmentation failed:', error));
}
