#!/usr/bin/env node

const bizSdk = require('facebook-nodejs-business-sdk');
const fs = require('fs');
const path = require('path');

// Initialize Facebook Business SDK
const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;
const AdSet = bizSdk.AdSet;
const Ad = bizSdk.Ad;
const Page = bizSdk.Page;
const User = bizSdk.User;

class FacebookMarketingCLI {
  constructor() {
    this.configPath = path.join(process.env.HOME, '.facebook-marketing-config.json');
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        bizSdk.FacebookAdsApi.init(this.config.accessToken);
      } else {
        this.config = {};
      }
    } catch (error) {
      console.error('Error loading config:', error.message);
      this.config = {};
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('✅ Configuration saved successfully');
    } catch (error) {
      console.error('❌ Error saving config:', error.message);
    }
  }

  async setup(accessToken, adAccountId = null) {
    console.log('🔧 Setting up Facebook Marketing API credentials...');

    this.config.accessToken = accessToken;
    if (adAccountId) {
      this.config.adAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    }

    try {
      // Initialize API
      bizSdk.FacebookAdsApi.init(accessToken);

      // Test the connection
      const me = new User('me');
      const userInfo = await me.get(['id', 'name']);
      console.log(`✅ Connected as: ${userInfo.name} (ID: ${userInfo.id})`);

      // Get ad accounts if not provided
      if (!adAccountId) {
        const adAccounts = await me.getAdAccounts(['id', 'name', 'account_status']);
        console.log('\n📋 Available Ad Accounts:');
        adAccounts.forEach(account => {
          console.log(`  - ${account.name} (${account.id}) - Status: ${account.account_status}`);
        });
        console.log(
          '\n💡 Use: node facebook-marketing-cli.js setup <access_token> <ad_account_id>'
        );
      }

      this.saveConfig();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async getCampaigns() {
    if (!this.config.adAccountId) {
      console.error('❌ Ad account ID not configured. Run setup first.');
      return;
    }

    try {
      const account = new AdAccount(this.config.adAccountId);
      const campaigns = await account.getCampaigns([
        'id',
        'name',
        'status',
        'objective',
        'daily_budget',
        'lifetime_budget',
      ]);

      console.log(`\n📊 Campaigns for ${this.config.adAccountId}:`);
      console.log('='.repeat(80));

      campaigns.forEach(campaign => {
        const budget = campaign.daily_budget
          ? `Daily: $${(campaign.daily_budget / 100).toFixed(2)}`
          : `Lifetime: $${(campaign.lifetime_budget / 100).toFixed(2)}`;

        console.log(`🎯 ${campaign.name}`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Objective: ${campaign.objective}`);
        console.log(`   Budget: ${budget}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error.message);
    }
  }

  async getAdSets(campaignId = null) {
    if (!this.config.adAccountId) {
      console.error('❌ Ad account ID not configured. Run setup first.');
      return;
    }

    try {
      let adSets;
      if (campaignId) {
        const campaign = new Campaign(campaignId);
        adSets = await campaign.getAdSets([
          'id',
          'name',
          'status',
          'daily_budget',
          'lifetime_budget',
          'targeting',
        ]);
        console.log(`\n📈 Ad Sets for Campaign ${campaignId}:`);
      } else {
        const account = new AdAccount(this.config.adAccountId);
        adSets = await account.getAdSets([
          'id',
          'name',
          'status',
          'campaign_id',
          'daily_budget',
          'lifetime_budget',
        ]);
        console.log(`\n📈 All Ad Sets for ${this.config.adAccountId}:`);
      }

      console.log('='.repeat(80));

      adSets.forEach(adSet => {
        const budget = adSet.daily_budget
          ? `Daily: $${(adSet.daily_budget / 100).toFixed(2)}`
          : `Lifetime: $${(adSet.lifetime_budget / 100).toFixed(2)}`;

        console.log(`📊 ${adSet.name}`);
        console.log(`   ID: ${adSet.id}`);
        console.log(`   Status: ${adSet.status}`);
        if (adSet.campaign_id) console.log(`   Campaign: ${adSet.campaign_id}`);
        console.log(`   Budget: ${budget}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Error fetching ad sets:', error.message);
    }
  }

  async getInsights(objectId, objectType = 'campaign', dateRange = 'last_7_days') {
    try {
      let object;
      switch (objectType) {
        case 'campaign':
          object = new Campaign(objectId);
          break;
        case 'adset':
          object = new AdSet(objectId);
          break;
        case 'ad':
          object = new Ad(objectId);
          break;
        case 'account':
          object = new AdAccount(objectId);
          break;
        default:
          throw new Error('Invalid object type. Use: campaign, adset, ad, or account');
      }

      const insights = await object.getInsights(
        ['impressions', 'clicks', 'spend', 'cpm', 'cpc', 'ctr', 'reach'],
        {
          date_preset: dateRange,
        }
      );

      console.log(`\n📊 Insights for ${objectType} ${objectId} (${dateRange}):`);
      console.log('='.repeat(80));

      if (insights.length > 0) {
        const data = insights[0];
        console.log(`💰 Spend: $${parseFloat(data.spend || 0).toFixed(2)}`);
        console.log(`👁️  Impressions: ${parseInt(data.impressions || 0).toLocaleString()}`);
        console.log(`👆 Clicks: ${parseInt(data.clicks || 0).toLocaleString()}`);
        console.log(`🎯 Reach: ${parseInt(data.reach || 0).toLocaleString()}`);
        console.log(`📈 CTR: ${parseFloat(data.ctr || 0).toFixed(2)}%`);
        console.log(`💵 CPC: $${parseFloat(data.cpc || 0).toFixed(2)}`);
        console.log(`📺 CPM: $${parseFloat(data.cpm || 0).toFixed(2)}`);
      } else {
        console.log('No insights data available for the specified period.');
      }
    } catch (error) {
      console.error('❌ Error fetching insights:', error.message);
    }
  }

  async getPages() {
    try {
      const me = new User('me');
      const pages = await me.getAccounts(['id', 'name', 'category', 'fan_count']);

      console.log('\n📱 Your Facebook Pages:');
      console.log('='.repeat(80));

      pages.forEach(page => {
        console.log(`📄 ${page.name}`);
        console.log(`   ID: ${page.id}`);
        console.log(`   Category: ${page.category}`);
        console.log(`   Followers: ${parseInt(page.fan_count || 0).toLocaleString()}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Error fetching pages:', error.message);
    }
  }

  showHelp() {
    console.log(`
🚀 Facebook Marketing API CLI

📋 Available Commands:

Setup & Configuration:
  setup <access_token> [ad_account_id]  Set up API credentials
  
Campaign Management:
  campaigns                             List all campaigns
  adsets [campaign_id]                  List ad sets (all or for specific campaign)
  
Analytics & Insights:
  insights <object_id> [type] [range]   Get performance insights
                                        Types: campaign, adset, ad, account
                                        Ranges: today, yesterday, last_7_days, last_30_days
  
Page Management:
  pages                                 List your Facebook pages
  
Examples:
  node facebook-marketing-cli.js setup EAAB...xyz act_123456789
  node facebook-marketing-cli.js campaigns
  node facebook-marketing-cli.js insights 123456789 campaign last_30_days
  node facebook-marketing-cli.js pages

💡 Tips:
  - Get your access token from Facebook Developers Console
  - Ad account IDs can be found in Facebook Ads Manager
  - Use 'act_' prefix for ad account IDs or it will be added automatically
        `);
  }
}

// CLI Interface
async function main() {
  const cli = new FacebookMarketingCLI();
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    cli.showHelp();
    return;
  }

  switch (command) {
    case 'setup':
      if (!args[1]) {
        console.error('❌ Access token required. Usage: setup <access_token> [ad_account_id]');
        process.exit(1);
      }
      await cli.setup(args[1], args[2]);
      break;

    case 'campaigns':
      await cli.getCampaigns();
      break;

    case 'adsets':
      await cli.getAdSets(args[1]);
      break;

    case 'insights':
      if (!args[1]) {
        console.error('❌ Object ID required. Usage: insights <object_id> [type] [date_range]');
        process.exit(1);
      }
      await cli.getInsights(args[1], args[2] || 'campaign', args[3] || 'last_7_days');
      break;

    case 'pages':
      await cli.getPages();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      cli.showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = FacebookMarketingCLI;
