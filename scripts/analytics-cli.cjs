#!/usr/bin/env node

/**
 * Google Analytics CLI Tool
 *
 * Commands:
 * - audiences: List, create, and manage audiences
 * - reports: Generate custom reports
 * - metrics: Get real-time metrics
 * - properties: List GA properties
 */

const { GoogleAuth } = require('google-auth-library');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { google } = require('googleapis');

class AnalyticsCLI {
  constructor() {
    this.auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.edit',
      ],
    });
    this.analyticsData = new BetaAnalyticsDataClient({ auth: this.auth });
    // We'll detect the property ID automatically
    this.propertyId = process.env.GA4_PROPERTY_ID || 'properties/459578499';
  }

  async listAudiences() {
    try {
      console.log('🎯 Fetching audiences...\n');

      const analytics = google.analyticsadmin('v1beta');
      const authClient = await this.auth.getClient();

      const response = await analytics.properties.audiences.list({
        auth: authClient,
        parent: this.propertyId,
      });

      if (response.data.audiences && response.data.audiences.length > 0) {
        console.log('📊 Current Audiences:');
        console.log('=====================');

        response.data.audiences.forEach((audience, index) => {
          console.log(`${index + 1}. ${audience.displayName}`);
          console.log(`   Description: ${audience.description || 'No description'}`);
          console.log(`   Membership Duration: ${audience.membershipDurationDays} days`);
          console.log(`   Created: ${new Date(audience.createTime).toLocaleDateString()}`);
          console.log('');
        });
      } else {
        console.log('No audiences found.');
      }
    } catch (error) {
      console.error('Error listing audiences:', error.message);
    }
  }

  async createAudience(name, description, filterConfig) {
    try {
      console.log(`🎯 Creating audience: ${name}...\n`);

      const analytics = google.analyticsadmin('v1beta');
      const authClient = await this.auth.getClient();

      const audience = {
        displayName: name,
        description: description,
        membershipDurationDays: 30,
        filterClauses: filterConfig,
      };

      const response = await analytics.properties.audiences.create({
        auth: authClient,
        parent: this.propertyId,
        requestBody: audience,
      });

      console.log('✅ Audience created successfully!');
      console.log(`   Name: ${response.data.displayName}`);
      console.log(`   Resource Name: ${response.data.name}`);
      console.log('');
    } catch (error) {
      console.error('Error creating audience:', error.message);
      if (error.details) {
        console.error('Details:', JSON.stringify(error.details, null, 2));
      }
    }
  }

  async getRealtimeReport() {
    try {
      console.log('📈 Fetching real-time data...\n');

      const [response] = await this.analyticsData.runRealtimeReport({
        property: this.propertyId,
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
      });

      console.log('🌐 Real-time Active Users by Location:');
      console.log('=====================================');

      if (response.rows && response.rows.length > 0) {
        response.rows.forEach(row => {
          const country = row.dimensionValues[0].value;
          const city = row.dimensionValues[1].value;
          const activeUsers = row.metricValues[0].value;

          console.log(`${country}, ${city}: ${activeUsers} active users`);
        });
      } else {
        console.log('No active users at the moment.');
      }
      console.log('');
    } catch (error) {
      console.error('Error fetching real-time data:', error.message);
    }
  }

  async getBasicReport(startDate = '30daysAgo', endDate = 'today') {
    try {
      console.log(`📊 Fetching analytics report (${startDate} to ${endDate})...\n`);

      const [response] = await this.analyticsData.runReport({
        property: this.propertyId,
        dateRanges: [
          {
            startDate: startDate,
            endDate: endDate,
          },
        ],
        dimensions: [{ name: 'date' }, { name: 'pagePath' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [
          {
            metric: { metricName: 'sessions' },
            desc: true,
          },
        ],
        limit: 10,
      });

      console.log('📈 Top Pages by Sessions:');
      console.log('=========================');

      if (response.rows && response.rows.length > 0) {
        response.rows.forEach((row, index) => {
          const _date = row.dimensionValues[0].value;
          const pagePath = row.dimensionValues[1].value;
          const activeUsers = row.metricValues[0].value;
          const sessions = row.metricValues[1].value;
          const pageViews = row.metricValues[2].value;
          const bounceRate = (parseFloat(row.metricValues[3].value) * 100).toFixed(1);
          const avgDuration = Math.round(parseFloat(row.metricValues[4].value));

          console.log(`${index + 1}. ${pagePath}`);
          console.log(`   Users: ${activeUsers} | Sessions: ${sessions} | Views: ${pageViews}`);
          console.log(`   Bounce Rate: ${bounceRate}% | Avg Duration: ${avgDuration}s`);
          console.log('');
        });
      } else {
        console.log('No data found for the specified period.');
      }
    } catch (error) {
      console.error('Error fetching report:', error.message);
    }
  }

  async getProperties() {
    try {
      console.log('🏢 Fetching GA properties...\n');

      const analytics = google.analyticsadmin('v1beta');
      const authClient = await this.auth.getClient();

      const response = await analytics.accounts.list({
        auth: authClient,
      });

      if (response.data.accounts && response.data.accounts.length > 0) {
        for (const account of response.data.accounts) {
          console.log(`Account: ${account.displayName} (${account.name})`);

          const propertiesResponse = await analytics.accounts.properties.list({
            auth: authClient,
            parent: account.name,
          });

          if (propertiesResponse.data.properties) {
            propertiesResponse.data.properties.forEach(property => {
              console.log(`  └─ Property: ${property.displayName}`);
              console.log(`     ID: ${property.name}`);
              console.log(`     URL: ${property.websiteUrl || 'N/A'}`);
              console.log('');
            });
          }
        }
      } else {
        console.log('No accounts found.');
      }
    } catch (error) {
      console.error('Error fetching properties:', error.message);
    }
  }

  async createEngagedUsersAudience() {
    const filterConfig = [
      {
        audienceFilterExpression: {
          andGroup: {
            filterExpressions: [
              {
                dimensionFilter: {
                  fieldName: 'sessionDuration',
                  numericFilter: {
                    operation: 'GREATER_THAN',
                    value: { int64Value: '30' },
                  },
                },
              },
              {
                dimensionFilter: {
                  fieldName: 'screenPageViews',
                  numericFilter: {
                    operation: 'GREATER_THAN_OR_EQUAL',
                    value: { int64Value: '2' },
                  },
                },
              },
            ],
          },
        },
      },
    ];

    await this.createAudience(
      'Engaged Users',
      'Users who spent >30 seconds and viewed 2+ pages',
      filterConfig
    );
  }

  async createHighIntentAudience() {
    const filterConfig = [
      {
        audienceFilterExpression: {
          orGroup: {
            filterExpressions: [
              {
                dimensionFilter: {
                  fieldName: 'pagePath',
                  stringFilter: {
                    matchType: 'CONTAINS',
                    value: 'pricing',
                  },
                },
              },
              {
                dimensionFilter: {
                  fieldName: 'pagePath',
                  stringFilter: {
                    matchType: 'CONTAINS',
                    value: 'download',
                  },
                },
              },
              {
                dimensionFilter: {
                  fieldName: 'pagePath',
                  stringFilter: {
                    matchType: 'CONTAINS',
                    value: 'features',
                  },
                },
              },
            ],
          },
        },
      },
    ];

    await this.createAudience(
      'High Intent Users',
      'Users who viewed pricing, download, or features pages',
      filterConfig
    );
  }
}

// CLI Interface
async function main() {
  const cli = new AnalyticsCLI();
  const command = process.argv[2];
  const subcommand = process.argv[3];

  console.log('🔍 RinaWarp Analytics CLI\n');

  try {
    switch (command) {
      case 'audiences':
        if (subcommand === 'list') {
          await cli.listAudiences();
        } else if (subcommand === 'create-engaged') {
          await cli.createEngagedUsersAudience();
        } else if (subcommand === 'create-intent') {
          await cli.createHighIntentAudience();
        } else {
          console.log('Usage: node analytics-cli.js audiences [list|create-engaged|create-intent]');
        }
        break;

      case 'report':
        if (subcommand) {
          await cli.getBasicReport(subcommand, process.argv[4] || 'today');
        } else {
          await cli.getBasicReport();
        }
        break;

      case 'realtime':
        await cli.getRealtimeReport();
        break;

      case 'properties':
        await cli.getProperties();
        break;

      default:
        console.log('Available commands:');
        console.log('  audiences list              - List all audiences');
        console.log('  audiences create-engaged    - Create engaged users audience');
        console.log('  audiences create-intent     - Create high-intent users audience');
        console.log('  report [startDate] [endDate] - Generate analytics report');
        console.log('  realtime                    - Show real-time active users');
        console.log('  properties                  - List GA properties');
        console.log('');
        console.log('Examples:');
        console.log('  node analytics-cli.js audiences list');
        console.log('  node analytics-cli.js report 7daysAgo today');
        console.log('  node analytics-cli.js realtime');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = AnalyticsCLI;
