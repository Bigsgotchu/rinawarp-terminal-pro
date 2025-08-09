/**
 * 🔌 GA4 API Connector for RinaWarp Analytics Dashboard
 * Connects your analytics dashboard to real Google Analytics 4 data
 *
 * Setup Instructions:
 * 1. Enable Google Analytics Data API in Google Cloud Console
 * 2. Create service account and download credentials JSON
 * 3. Add service account email to GA4 property as viewer
 * 4. Set environment variables or update config below
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';

class RinaWarpGA4Connector {
  constructor(config = {}) {
    this.propertyId = config.propertyId || process.env.GA4_PROPERTY_ID || '425994488'; // Your GA4 property ID
    this.credentials = config.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Initialize GA4 client
    this.analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: this.credentials, // Path to service account JSON
      projectId: config.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔌 Initializing GA4 API connector...');

      // Test connection with a simple request
      await this.testConnection();

      this.initialized = true;
      console.log('✅ GA4 API connector initialized successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize GA4 API connector:', error);
      return false;
    }
  }

  async testConnection() {
    const [response] = await this.analyticsDataClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
    });

    console.log(
      '🧪 Connection test successful. Sessions today:',
      response.rows?.[0]?.metricValues?.[0]?.value || '0'
    );
  }

  /**
   * Get revenue and conversion metrics for dashboard
   */
  async getRevenueMetrics(dateRange = 'today') {
    if (!this.initialized) {
      throw new Error('GA4 connector not initialized. Call initialize() first.');
    }

    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          { startDate: dateRange, endDate: dateRange },
          {
            startDate: this.getPreviousPeriod(dateRange),
            endDate: this.getPreviousPeriod(dateRange),
          },
        ],
        metrics: [
          { name: 'purchaseRevenue' },
          { name: 'conversions' },
          { name: 'sessions' },
          { name: 'users' },
          { name: 'averagePurchaseRevenue' },
        ],
        dimensions: [{ name: 'date' }],
      });

      return this.formatRevenueData(response);
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel data
   */
  async getFunnelMetrics(dateRange = 'today') {
    if (!this.initialized) {
      throw new Error('GA4 connector not initialized. Call initialize() first.');
    }

    try {
      // Get custom events for funnel analysis
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: dateRange, endDate: dateRange }],
        metrics: [{ name: 'eventCount' }],
        dimensions: [{ name: 'eventName' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: [
                'page_view',
                'view_promotion',
                'select_item',
                'begin_checkout',
                'purchase',
                'funnel_step',
              ],
            },
          },
        },
      });

      return this.formatFunnelData(response);
    } catch (error) {
      console.error('Error fetching funnel metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue attribution data
   */
  async getAttributionMetrics(dateRange = '30daysAgo') {
    if (!this.initialized) {
      throw new Error('GA4 connector not initialized. Call initialize() first.');
    }

    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        metrics: [{ name: 'purchaseRevenue' }, { name: 'conversions' }],
        dimensions: [
          { name: 'firstUserSource' },
          { name: 'firstUserMedium' },
          { name: 'firstUserCampaign' },
        ],
        orderBys: [
          {
            metric: { metricName: 'purchaseRevenue' },
            desc: true,
          },
        ],
        limit: 10,
      });

      return this.formatAttributionData(response);
    } catch (error) {
      console.error('Error fetching attribution metrics:', error);
      throw error;
    }
  }

  /**
   * Get real-time activity data
   */
  async getRealTimeActivity() {
    if (!this.initialized) {
      throw new Error('GA4 connector not initialized. Call initialize() first.');
    }

    try {
      // Use Real-time API for live data
      const [response] = await this.analyticsDataClient.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
        dimensions: [{ name: 'eventName' }, { name: 'country' }],
        limit: 20,
      });

      return this.formatRealTimeData(response);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(timeRange = 'today') {
    try {
      console.log(`📊 Fetching dashboard data for ${timeRange}...`);

      const [revenueMetrics, funnelMetrics, attributionMetrics, realTimeActivity] =
        await Promise.all([
          this.getRevenueMetrics(timeRange),
          this.getFunnelMetrics(timeRange),
          this.getAttributionMetrics('30daysAgo'),
          this.getRealTimeActivity(),
        ]);

      const dashboardData = {
        timestamp: new Date().toISOString(),
        timeRange: timeRange,
        revenue: revenueMetrics,
        funnel: funnelMetrics,
        attribution: attributionMetrics,
        realTime: realTimeActivity,
        insights: this.generateInsights(revenueMetrics, funnelMetrics, attributionMetrics),
      };

      console.log('✅ Dashboard data fetched successfully');
      return dashboardData;
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Data formatting helpers
  formatRevenueData(response) {
    const currentPeriod = response.rows?.[0] || {};
    const previousPeriod = response.rows?.[1] || {};

    const current = {
      revenue: parseFloat(currentPeriod.metricValues?.[0]?.value || '0'),
      conversions: parseInt(currentPeriod.metricValues?.[1]?.value || '0'),
      sessions: parseInt(currentPeriod.metricValues?.[2]?.value || '0'),
      users: parseInt(currentPeriod.metricValues?.[3]?.value || '0'),
      averageOrder: parseFloat(currentPeriod.metricValues?.[4]?.value || '0'),
    };

    const previous = {
      revenue: parseFloat(previousPeriod.metricValues?.[0]?.value || '0'),
      conversions: parseInt(previousPeriod.metricValues?.[1]?.value || '0'),
      sessions: parseInt(previousPeriod.metricValues?.[2]?.value || '0'),
      users: parseInt(previousPeriod.metricValues?.[3]?.value || '0'),
      averageOrder: parseFloat(previousPeriod.metricValues?.[4]?.value || '0'),
    };

    return {
      revenue: {
        value: current.revenue,
        change: this.calculatePercentChange(current.revenue, previous.revenue),
      },
      conversions: {
        value: current.conversions,
        change: this.calculatePercentChange(current.conversions, previous.conversions),
      },
      conversionRate: {
        value: current.sessions > 0 ? (current.conversions / current.sessions) * 100 : 0,
        change: this.calculateConversionRateChange(current, previous),
      },
      visitors: {
        value: current.users,
        change: this.calculatePercentChange(current.users, previous.users),
      },
      averageOrder: {
        value: current.averageOrder,
        change: this.calculatePercentChange(current.averageOrder, previous.averageOrder),
      },
    };
  }

  formatFunnelData(response) {
    const eventCounts = {};

    response.rows?.forEach(row => {
      const eventName = row.dimensionValues[0].value;
      const count = parseInt(row.metricValues[0].value);
      eventCounts[eventName] = count;
    });

    return {
      visits: eventCounts['page_view'] || 0,
      pricing: eventCounts['view_promotion'] || 0,
      selection: eventCounts['select_item'] || 0,
      checkout: eventCounts['begin_checkout'] || 0,
      purchase: eventCounts['purchase'] || 0,
    };
  }

  formatAttributionData(response) {
    return (
      response.rows?.map(row => ({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        campaign: row.dimensionValues[2].value,
        revenue: parseFloat(row.metricValues[0].value),
        conversions: parseInt(row.metricValues[1].value),
      })) || []
    );
  }

  formatRealTimeData(response) {
    return (
      response.rows?.map(row => ({
        event: row.dimensionValues[0].value,
        country: row.dimensionValues[1].value,
        activeUsers: parseInt(row.metricValues[0].value),
        eventCount: parseInt(row.metricValues[1].value),
        timestamp: new Date(),
      })) || []
    );
  }

  // Utility functions
  calculatePercentChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  calculateConversionRateChange(current, previous) {
    const currentRate = current.sessions > 0 ? (current.conversions / current.sessions) * 100 : 0;
    const previousRate =
      previous.sessions > 0 ? (previous.conversions / previous.sessions) * 100 : 0;
    return this.calculatePercentChange(currentRate, previousRate);
  }

  getPreviousPeriod(dateRange) {
    switch (dateRange) {
      case 'today':
        return 'yesterday';
      case '7daysAgo':
        return '14daysAgo';
      case '30daysAgo':
        return '60daysAgo';
      default:
        return 'yesterday';
    }
  }

  generateInsights(revenue, funnel, attribution) {
    const insights = [];

    // Revenue insights
    if (revenue.revenue.change < -10) {
      insights.push({
        type: 'warning',
        title: '📉 Revenue Decline Alert',
        description: `Revenue dropped ${Math.abs(revenue.revenue.change).toFixed(1)}% compared to previous period. Review marketing channels and conversion funnel.`,
      });
    } else if (revenue.revenue.change > 20) {
      insights.push({
        type: 'success',
        title: '📈 Revenue Growth',
        description: `Excellent! Revenue increased ${revenue.revenue.change.toFixed(1)}% compared to previous period.`,
      });
    }

    // Funnel insights
    const checkoutRate = funnel.checkout > 0 ? (funnel.purchase / funnel.checkout) * 100 : 0;
    if (checkoutRate < 50) {
      insights.push({
        type: 'opportunity',
        title: '🛒 Checkout Optimization',
        description: `Only ${checkoutRate.toFixed(1)}% of users complete checkout. Consider simplifying the payment process.`,
      });
    }

    // Attribution insights
    if (attribution.length > 0) {
      const topSource = attribution[0];
      insights.push({
        type: 'info',
        title: '🎯 Top Revenue Source',
        description: `${topSource.source} (${topSource.medium}) generated $${topSource.revenue.toFixed(2)} with ${topSource.conversions} conversions.`,
      });
    }

    return insights;
  }
}

// Export for use in dashboard
export { RinaWarpGA4Connector };

// Usage example:
/*
const connector = new RinaWarpGA4Connector({
    propertyId: '425994488', // Your GA4 property ID
    credentials: './path/to/service-account.json'
});

await connector.initialize();
const dashboardData = await connector.getDashboardData('7daysAgo');
console.log('Dashboard data:', dashboardData);
*/

// For browser usage, add this to your dashboard HTML:
/*
<script type="module">
import { RinaWarpGA4Connector } from '/ga4-api-connector.js';

// Replace mock data in dashboard with real data
async function loadRealAnalyticsData() {
    const connector = new RinaWarpGA4Connector();
    await connector.initialize();
    
    const data = await connector.getDashboardData(currentTimeRange);
    
    // Update dashboard with real data
    dashboardData = data.revenue;
    dashboardData.funnelData = data.funnel;
    
    updateDashboardDisplay();
}

// Replace the mock loadAnalyticsData function
window.loadAnalyticsData = loadRealAnalyticsData;
</script>
*/
