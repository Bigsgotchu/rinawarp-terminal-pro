/**
 * RinaWarp Terminal - Plugin Community Manager
 * Manages community engagement, feedback, and plugin ecosystem
 */

export class PluginCommunityManager {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.apiEndpoint = 'https://community.rinawarp.com/api';
    this.feedbackQueue = [];
    this.ratings = new Map();
    this.reviews = new Map();
    this.userProfile = null;
    this.communityFeatures = {
      ratings: true,
      reviews: true,
      suggestions: true,
      sharing: true,
      analytics: true,
    };

    this.init();
  }

  async init() {
    await this.loadUserProfile();
    await this.loadCommunityData();
    this.setupEventListeners();
  }

  async loadUserProfile() {
    try {
      const userData = localStorage.getItem('rinawarp-user-profile');
      if (userData) {
        this.userProfile = JSON.parse(userData);
      } else {
        this.userProfile = {
          id: this.generateUserId(),
          username: 'Anonymous',
          preferences: {
            shareUsageData: false,
            receiveRecommendations: true,
            participateInBeta: false,
          },
          stats: {
            pluginsInstalled: 0,
            pluginsRated: 0,
            reviewsWritten: 0,
            contributionsShared: 0,
          },
        };
        this.saveUserProfile();
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  saveUserProfile() {
    localStorage.setItem('rinawarp-user-profile', JSON.stringify(this.userProfile));
  }

  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async loadCommunityData() {
    try {
      // Load cached ratings and reviews
      const cachedRatings = localStorage.getItem('plugin-ratings');
      if (cachedRatings) {
        const ratings = JSON.parse(cachedRatings);
        for (const [pluginName, rating] of Object.entries(ratings)) {
          this.ratings.set(pluginName, rating);
        }
      }

      const cachedReviews = localStorage.getItem('plugin-reviews');
      if (cachedReviews) {
        const reviews = JSON.parse(cachedReviews);
        for (const [pluginName, reviewList] of Object.entries(reviews)) {
          this.reviews.set(pluginName, reviewList);
        }
      }

      // Sync with remote data
      await this.syncCommunityData();
    } catch (error) {
      console.error('Failed to load community data:', error);
    }
  }

  async syncCommunityData() {
    try {
      const response = await fetch(`${this.apiEndpoint}/community/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify({
          lastSync: localStorage.getItem('last-community-sync') || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update local data with remote changes
        if (data.ratings) {
          for (const [pluginName, rating] of Object.entries(data.ratings)) {
            this.ratings.set(pluginName, rating);
          }
        }

        if (data.reviews) {
          for (const [pluginName, reviewList] of Object.entries(data.reviews)) {
            this.reviews.set(pluginName, reviewList);
          }
        }

        localStorage.setItem('last-community-sync', Date.now().toString());
        this.saveCommunityData();
      }
    } catch (error) {
      console.error('Failed to sync community data:', error);
    }
  }

  saveCommunityData() {
    // Save ratings
    const ratingsObj = {};
    for (const [pluginName, rating] of this.ratings) {
      ratingsObj[pluginName] = rating;
    }
    localStorage.setItem('plugin-ratings', JSON.stringify(ratingsObj));

    // Save reviews
    const reviewsObj = {};
    for (const [pluginName, reviewList] of this.reviews) {
      reviewsObj[pluginName] = reviewList;
    }
    localStorage.setItem('plugin-reviews', JSON.stringify(reviewsObj));
  }

  setupEventListeners() {
    this.pluginManager.on('plugin-loaded', pluginName => {
      this.trackPluginInstall(pluginName);
    });

    this.pluginManager.on('plugin-unloaded', pluginName => {
      this.trackPluginUninstall(pluginName);
    });

    this.pluginManager.on('plugin-error', data => {
      this.trackPluginError(data.plugin, data.error);
    });
  }

  trackPluginInstall(pluginName) {
    if (this.userProfile.preferences.shareUsageData) {
      this.queueAnalytics({
        event: 'plugin_install',
        plugin: pluginName,
        timestamp: Date.now(),
        user: this.userProfile.id,
      });
    }

    this.userProfile.stats.pluginsInstalled++;
    this.saveUserProfile();
  }

  trackPluginUninstall(pluginName) {
    if (this.userProfile.preferences.shareUsageData) {
      this.queueAnalytics({
        event: 'plugin_uninstall',
        plugin: pluginName,
        timestamp: Date.now(),
        user: this.userProfile.id,
      });
    }
  }

  trackPluginError(pluginName, error) {
    if (this.userProfile.preferences.shareUsageData) {
      this.queueAnalytics({
        event: 'plugin_error',
        plugin: pluginName,
        error: error.message,
        timestamp: Date.now(),
        user: this.userProfile.id,
      });
    }
  }

  queueAnalytics(data) {
    this.feedbackQueue.push(data);

    // Send analytics if queue gets too large
    if (this.feedbackQueue.length >= 10) {
      this.sendAnalytics();
    }
  }

  async sendAnalytics() {
    if (this.feedbackQueue.length === 0) return;

    try {
      const response = await fetch(`${this.apiEndpoint}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify({
          events: this.feedbackQueue,
        }),
      });

      if (response.ok) {
        this.feedbackQueue = [];
      }
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  async ratePlugin(pluginName, rating, review = null) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const ratingData = {
      pluginName,
      rating,
      review,
      user: this.userProfile.id,
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/plugins/${pluginName}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify(ratingData),
      });

      if (response.ok) {
        // Update local rating
        const pluginRating = this.ratings.get(pluginName) || {
          average: 0,
          count: 0,
          userRating: null,
        };
        pluginRating.userRating = rating;
        this.ratings.set(pluginName, pluginRating);

        // Add review if provided
        if (review) {
          this.addReview(pluginName, {
            user: this.userProfile.username,
            rating,
            review,
            timestamp: Date.now(),
          });
        }

        this.userProfile.stats.pluginsRated++;
        if (review) this.userProfile.stats.reviewsWritten++;
        this.saveUserProfile();
        this.saveCommunityData();

        return true;
      }
    } catch (error) {
      console.error('Failed to rate plugin:', error);
      return false;
    }
  }

  addReview(pluginName, reviewData) {
    let reviews = this.reviews.get(pluginName) || [];
    reviews.push(reviewData);

    // Keep only the most recent 100 reviews
    if (reviews.length > 100) {
      reviews = reviews.slice(-100);
    }

    this.reviews.set(pluginName, reviews);
  }

  getPluginRating(pluginName) {
    return this.ratings.get(pluginName) || { average: 0, count: 0, userRating: null };
  }

  getPluginReviews(pluginName) {
    return this.reviews.get(pluginName) || [];
  }

  async getPluginRecommendations() {
    if (!this.userProfile.preferences.receiveRecommendations) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify({
          installedPlugins: Array.from(this.pluginManager.plugins.keys()),
          preferences: this.userProfile.preferences,
          stats: this.userProfile.stats,
        }),
      });

      if (response.ok) {
        const recommendations = await response.json();
        return recommendations.plugins || [];
      }
    } catch (error) {
      console.error('Failed to get plugin recommendations:', error);
    }

    return [];
  }

  async sharePlugin(pluginName, shareData) {
    const sharing = {
      pluginName,
      user: this.userProfile.id,
      username: this.userProfile.username,
      timestamp: Date.now(),
      ...shareData,
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/plugins/${pluginName}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify(sharing),
      });

      if (response.ok) {
        this.userProfile.stats.contributionsShared++;
        this.saveUserProfile();
        return true;
      }
    } catch (error) {
      console.error('Failed to share plugin:', error);
    }

    return false;
  }

  async reportPlugin(pluginName, reason, description) {
    const report = {
      pluginName,
      reason,
      description,
      user: this.userProfile.id,
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/plugins/${pluginName}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify(report),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to report plugin:', error);
      return false;
    }
  }

  async submitFeedback(feedback) {
    const feedbackData = {
      user: this.userProfile.id,
      username: this.userProfile.username,
      timestamp: Date.now(),
      ...feedback,
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify(feedbackData),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  }

  async getCommunityStats() {
    try {
      const response = await fetch(`${this.apiEndpoint}/stats`, {
        headers: {
          Authorization: `Bearer ${this.userProfile.id}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get community stats:', error);
    }

    return null;
  }

  async getPopularPlugins(limit = 10) {
    try {
      const response = await fetch(`${this.apiEndpoint}/plugins/popular?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${this.userProfile.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.plugins || [];
      }
    } catch (error) {
      console.error('Failed to get popular plugins:', error);
    }

    return [];
  }

  async getTrendingPlugins(limit = 10) {
    try {
      const response = await fetch(`${this.apiEndpoint}/plugins/trending?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${this.userProfile.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.plugins || [];
      }
    } catch (error) {
      console.error('Failed to get trending plugins:', error);
    }

    return [];
  }

  updateUserPreferences(preferences) {
    this.userProfile.preferences = { ...this.userProfile.preferences, ...preferences };
    this.saveUserProfile();
  }

  getUserProfile() {
    return { ...this.userProfile };
  }

  async joinBetaProgram() {
    try {
      const response = await fetch(`${this.apiEndpoint}/beta/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify({
          user: this.userProfile.id,
          username: this.userProfile.username,
        }),
      });

      if (response.ok) {
        this.userProfile.preferences.participateInBeta = true;
        this.saveUserProfile();
        return true;
      }
    } catch (error) {
      console.error('Failed to join beta program:', error);
    }

    return false;
  }

  async leaveBetaProgram() {
    try {
      const response = await fetch(`${this.apiEndpoint}/beta/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userProfile.id}`,
        },
        body: JSON.stringify({
          user: this.userProfile.id,
        }),
      });

      if (response.ok) {
        this.userProfile.preferences.participateInBeta = false;
        this.saveUserProfile();
        return true;
      }
    } catch (error) {
      console.error('Failed to leave beta program:', error);
    }

    return false;
  }

  async getBetaPlugins() {
    if (!this.userProfile.preferences.participateInBeta) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/beta/plugins`, {
        headers: {
          Authorization: `Bearer ${this.userProfile.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.plugins || [];
      }
    } catch (error) {
      console.error('Failed to get beta plugins:', error);
    }

    return [];
  }

  // Periodic sync with community data
  startPeriodicSync() {
    this.syncInterval = setInterval(
      () => {
        this.syncCommunityData();
        this.sendAnalytics();
      },
      5 * 60 * 1000
    ); // Sync every 5 minutes
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  // Export user data for backup or migration
  exportUserData() {
    return {
      profile: this.userProfile,
      ratings: Object.fromEntries(this.ratings),
      reviews: Object.fromEntries(this.reviews),
      exportDate: Date.now(),
    };
  }

  // Import user data from backup
  importUserData(data) {
    try {
      if (data.profile) {
        this.userProfile = data.profile;
        this.saveUserProfile();
      }

      if (data.ratings) {
        this.ratings.clear();
        for (const [pluginName, rating] of Object.entries(data.ratings)) {
          this.ratings.set(pluginName, rating);
        }
      }

      if (data.reviews) {
        this.reviews.clear();
        for (const [pluginName, reviewList] of Object.entries(data.reviews)) {
          this.reviews.set(pluginName, reviewList);
        }
      }

      this.saveCommunityData();
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }
}
