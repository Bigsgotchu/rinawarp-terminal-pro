#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Google Analytics Audience Creator
 * Creates custom audiences in Google Analytics using the Management API
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleAnalyticsAudienceCreator {
  constructor() {
    this.analytics = null;
    this.auth = null;
    this.accountId = process.env.GA_ACCOUNT_ID;
    this.propertyId = process.env.GA_PROPERTY_ID;
    this.viewId = process.env.GA_VIEW_ID;

    // Predefined audience templates
    this.audienceTemplates = {
      'power-users': {
        name: 'RinaWarp Power Users',
        description: 'Users who frequently use advanced terminal features',
        conditions: {
          sessions: { operator: 'GREATER_THAN', value: 10 },
          events: { eventName: 'ai_usage', operator: 'GREATER_THAN', value: 5 },
        },
      },
      'new-users': {
        name: 'RinaWarp New Users',
        description: 'Users who recently started using the terminal',
        conditions: {
          sessions: { operator: 'LESS_THAN', value: 3 },
          daysSinceFirstSession: { operator: 'LESS_THAN', value: 7 },
        },
      },
      'voice-users': {
        name: 'Voice Command Users',
        description: 'Users who actively use voice commands',
        conditions: {
          events: { eventName: 'voice_command', operator: 'GREATER_THAN', value: 1 },
        },
      },
      'enterprise-prospects': {
        name: 'Enterprise Prospects',
        description: 'Users showing enterprise-level usage patterns',
        conditions: {
          sessions: { operator: 'GREATER_THAN', value: 20 },
          events: { eventName: 'feature_usage', operator: 'GREATER_THAN', value: 15 },
        },
      },
      'conversion-ready': {
        name: 'Conversion Ready Users',
        description: 'Users likely to convert to paid plans',
        conditions: {
          sessions: { operator: 'GREATER_THAN', value: 5 },
          events: { eventName: 'premium_feature_attempt', operator: 'GREATER_THAN', value: 3 },
        },
      },
    };
  }

  /**
   * Initialize Google Analytics API authentication
   */
  async initialize() {
    try {
      // Try to load service account credentials
      const credentialsPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, '../config/ga-service-account.json');

      if (fs.existsSync(credentialsPath)) {
        console.log('🔑 Using service account authentication');
        this.auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/analytics.edit'],
        });
      } else {
        console.log('🔑 Using OAuth2 authentication (requires browser)');
        // For development, you might want to use OAuth2
        this.auth = new google.auth.OAuth2(
          process.env.GA_CLIENT_ID,
          process.env.GA_CLIENT_SECRET,
          'http://localhost:3000/oauth2callback'
        );
      }

      this.analytics = google.analytics({
        version: 'v3',
        auth: this.auth,
      });

      console.log('✅ Google Analytics API initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Analytics API:', error.message);
      return false;
    }
  }

  /**
   * List existing audiences
   */
  async listAudiences() {
    try {
      const response = await this.analytics.management.remarketingAudience.list({
        accountId: this.accountId,
        webPropertyId: this.propertyId,
      });

      const audiences = response.data.items || [];

      console.log(`📊 Found ${audiences.length} existing audiences:`);
      audiences.forEach((audience, index) => {
        console.log(`${index + 1}. ${audience.name} (ID: ${audience.id})`);
        console.log(`   Description: ${audience.description || 'No description'}`);
        console.log(`   Created: ${audience.created}`);
        console.log(
          `   Members: ${audience.audienceDefinition?.includeConditions?.membershipDurationDays || 'N/A'} days`
        );
        console.log('');
      });

      return audiences;
    } catch (error) {
      console.error('❌ Failed to list audiences:', error.message);
      return [];
    }
  }

  /**
   * Create a new audience
   */
  async createAudience(template, customName = null, customDescription = null) {
    try {
      const audienceConfig = this.audienceTemplates[template];
      if (!audienceConfig) {
        throw new Error(new Error(new Error(`Unknown audience template: ${template}`)));
      }

      const audienceDefinition = this.buildAudienceDefinition(audienceConfig.conditions);

      const audienceResource = {
        name: customName || audienceConfig.name,
        description: customDescription || audienceConfig.description,
        audienceDefinition: audienceDefinition,
        audienceType: 'SIMPLE',
        includeConditions: {
          membershipDurationDays: 30,
          segment: audienceDefinition,
        },
      };

      console.log(`🎯 Creating audience: ${audienceResource.name}`);
      console.log(`📝 Description: ${audienceResource.description}`);

      const response = await this.analytics.management.remarketingAudience.insert({
        accountId: this.accountId,
        webPropertyId: this.propertyId,
        resource: audienceResource,
      });

      console.log('✅ Audience created successfully!');
      console.log(`📊 Audience ID: ${response.data.id}`);
      console.log(
        `🔗 View in GA: https://analytics.google.com/analytics/web/#/report/remarketing-audiences/a${this.accountId}w${this.propertyId}p${this.viewId}/`
      );

      return response.data;
    } catch (error) {
      console.error('❌ Failed to create audience:', error.message);
      if (error.response?.data?.error?.message) {
        console.error('📋 API Error:', error.response.data.error.message);
      }
      return null;
    }
  }

  /**
   * Build audience definition from conditions
   */
  buildAudienceDefinition(conditions) {
    const segmentFilters = [];

    // Convert conditions to GA segment filters
    Object.entries(conditions).forEach(([key, condition]) => {
      switch (key) {
        case 'sessions':
          segmentFilters.push({
            simpleSegment: {
              orFiltersForSegment: [
                {
                  segmentFilterClauses: [
                    {
                      metricFilter: {
                        metricName: 'ga:sessions',
                        operator: condition.operator,
                        comparisonValue: condition.value.toString(),
                      },
                    },
                  ],
                },
              ],
            },
          });
          break;

        case 'events':
          segmentFilters.push({
            simpleSegment: {
              orFiltersForSegment: [
                {
                  segmentFilterClauses: [
                    {
                      dimensionFilter: {
                        dimensionName: 'ga:eventAction',
                        operator: 'EXACT',
                        expressions: [condition.eventName],
                      },
                    },
                  ],
                },
              ],
            },
          });
          break;

        case 'daysSinceFirstSession':
          segmentFilters.push({
            simpleSegment: {
              orFiltersForSegment: [
                {
                  segmentFilterClauses: [
                    {
                      metricFilter: {
                        metricName: 'ga:daysSinceLastSession',
                        operator: condition.operator,
                        comparisonValue: condition.value.toString(),
                      },
                    },
                  ],
                },
              ],
            },
          });
          break;
      }
    });

    return {
      segmentFilters: segmentFilters,
    };
  }

  /**
   * Create custom audience with user-defined conditions
   */
  async createCustomAudience(name, description, conditions) {
    try {
      const audienceDefinition = this.buildAudienceDefinition(conditions);

      const audienceResource = {
        name: name,
        description: description,
        audienceDefinition: audienceDefinition,
        audienceType: 'SIMPLE',
        includeConditions: {
          membershipDurationDays: 30,
          segment: audienceDefinition,
        },
      };

      console.log(`🎯 Creating custom audience: ${name}`);

      const response = await this.analytics.management.remarketingAudience.insert({
        accountId: this.accountId,
        webPropertyId: this.propertyId,
        resource: audienceResource,
      });

      console.log('✅ Custom audience created successfully!');
      console.log(`📊 Audience ID: ${response.data.id}`);

      return response.data;
    } catch (error) {
      console.error('❌ Failed to create custom audience:', error.message);
      return null;
    }
  }

  /**
   * Delete an audience
   */
  async deleteAudience(audienceId) {
    try {
      await this.analytics.management.remarketingAudience.delete({
        accountId: this.accountId,
        webPropertyId: this.propertyId,
        remarketingAudienceId: audienceId,
      });

      console.log(`✅ Audience ${audienceId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete audience:', error.message);
      return false;
    }
  }

  /**
   * Show available templates
   */
  showTemplates() {
    console.log('🎯 Available audience templates:');
    console.log('');

    Object.entries(this.audienceTemplates).forEach(([key, template]) => {
      console.log(`📊 ${key}:`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Description: ${template.description}`);
      console.log('');
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
🎯 Google Analytics Audience Creator

Usage:
  node create-ga-audience.js <command> [options]

Commands:
  list                          List existing audiences
  templates                     Show available audience templates
  create <template>             Create audience from template
  create-custom <name> <desc>   Create custom audience
  delete <audienceId>           Delete an audience

Templates:
  power-users                   Users with high engagement
  new-users                    Recently onboarded users
  voice-users                  Users who use voice commands
  enterprise-prospects         High-value potential customers
  conversion-ready             Users likely to convert

Environment Variables:
  GA_ACCOUNT_ID                Your GA account ID
  GA_PROPERTY_ID               Your GA property ID
  GA_VIEW_ID                   Your GA view ID
  GOOGLE_APPLICATION_CREDENTIALS  Path to service account JSON

Examples:
  node create-ga-audience.js list
  node create-ga-audience.js create power-users
  node create-ga-audience.js create-custom "High Value Users" "Users with premium behavior"
    `);
    return;
  }

  const creator = new GoogleAnalyticsAudienceCreator();

  // Check environment variables
  if (!creator.accountId || !creator.propertyId) {
    console.error('❌ Missing required environment variables:');
    console.error('   GA_ACCOUNT_ID, GA_PROPERTY_ID, GA_VIEW_ID');
    console.error('   Set these in your .env file or export them');
    return;
  }

  const initialized = await creator.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize. Check your credentials.');
    return;
  }

  try {
    switch (command) {
      case 'list':
        await creator.listAudiences();
        break;

      case 'templates':
        creator.showTemplates();
        break;

      case 'create':
        const template = args[1];
        if (!template) {
          console.error('❌ Please specify a template name');
          creator.showTemplates();
          return;
        }
        await creator.createAudience(template);
        break;

      case 'create-custom':
        const name = args[1];
        const description = args[2];
        if (!name || !description) {
          console.error('❌ Please specify both name and description');
          return;
        }
        // Example custom conditions - you can modify these
        const customConditions = {
          sessions: { operator: 'GREATER_THAN', value: 5 },
          events: { eventName: 'feature_usage', operator: 'GREATER_THAN', value: 3 },
        };
        await creator.createCustomAudience(name, description, customConditions);
        break;

      case 'delete':
        const audienceId = args[1];
        if (!audienceId) {
          console.error('❌ Please specify an audience ID');
          return;
        }
        await creator.deleteAudience(audienceId);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default GoogleAnalyticsAudienceCreator;
