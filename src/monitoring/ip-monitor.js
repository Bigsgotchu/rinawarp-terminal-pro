/**
 * RinaWarp Terminal - IP Monitoring System
 * Monitors for unauthorized use, trademark violations, and code theft
 */

import axios from 'axios';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

class IPMonitoringSystem {
  constructor(config = {}) {
    this.config = {
      emailConfig: config.email || {},
      alertRecipients: config.alertRecipients || ['admin@rinawarp.com'],
      monitoringInterval: config.monitoringInterval || '0 */6 * * *', // Every 6 hours
      githubToken: config.githubToken || process.env.GITHUB_TOKEN,
      googleApiKey: config.googleApiKey || process.env.GOOGLE_API_KEY,
      ...config,
    };

    this.monitoredTerms = [
      'RinaWarp Terminal',
      'RinaWarp',
      'rinawarp-terminal',
      'RinaWarp Technologies',
    ];

    this.monitoredDomains = [
      'rinawarp.com',
      'rinawarp.net',
      'rinawarp.org',
      'rinawarp-terminal.com',
    ];

    this.violations = [];
    this.lastScanResults = {};

    this.setupEmailTransporter();
    this.initializeMonitoring();
  }

  /**
   * Setup email notifications
   */
  setupEmailTransporter() {
    if (this.config.emailConfig.service) {
      try {
        this.emailTransporter = nodemailer.createTransporter({
          service: this.config.emailConfig.service,
          auth: {
            user: this.config.emailConfig.user,
            pass: this.config.emailConfig.pass,
          },
        });
      } catch (error) {
        console.log('⚠️ Email configuration disabled:', error.message);
        this.emailTransporter = null;
      }
    }
  }

  /**
   * Initialize monitoring schedules
   */
  initializeMonitoring() {
    console.log('🔍 Initializing IP Monitoring System...');

    // Schedule periodic monitoring
    cron.schedule(this.monitoringInterval, () => {
      this.runFullMonitoringScan();
    });

    // Run initial scan
    setTimeout(() => {
      this.runFullMonitoringScan();
    }, 5000);

    console.log(`📅 Monitoring scheduled: ${this.monitoringInterval}`);
  }

  /**
   * Run complete monitoring scan
   */
  async runFullMonitoringScan() {
    console.log('🔍 Starting IP monitoring scan...');
    const scanResults = {
      timestamp: new Date().toISOString(),
      github: await this.monitorGitHub(),
      npm: await this.monitorNPM(),
      domains: await this.monitorDomains(),
      googleAlerts: await this.checkGoogleResults(),
      socialMedia: await this.monitorSocialMedia(),
      violations: [],
    };

    // Analyze results for violations
    scanResults.violations = this.analyzeForViolations(scanResults);

    // Store results
    await this.storeScanResults(scanResults);

    // Send alerts if violations found
    if (scanResults.violations.length > 0) {
      await this.sendViolationAlert(scanResults.violations);
    }

    this.lastScanResults = scanResults;
    console.log(
      `✅ Monitoring scan complete. Found ${scanResults.violations.length} potential violations.`
    );
  }

  /**
   * Monitor GitHub for unauthorized repositories
   */
  async monitorGitHub() {
    console.log('🔍 Monitoring GitHub...');
    const results = [];

    try {
      for (const term of this.monitoredTerms) {
        const response = await axios.get('https://api.github.com/search/repositories', {
          params: {
            q: term,
            sort: 'updated',
            order: 'desc',
          },
          headers: this.config.githubToken
            ? {
                Authorization: `token ${this.config.githubToken}`,
              }
            : {},
        });

        for (const repo of response.data.items.slice(0, 10)) {
          // Skip our own repositories
          if (repo.owner.login === 'Bigsgotchu') continue;

          results.push({
            type: 'github_repository',
            url: repo.html_url,
            title: repo.full_name,
            description: repo.description,
            owner: repo.owner.login,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updated: repo.updated_at,
            searchTerm: term,
            riskLevel: this.assessGitHubRisk(repo, term),
          });
        }
      }
    } catch (error) {
      console.error('GitHub monitoring error:', error.message);
    }

    return results;
  }

  /**
   * Monitor NPM for package name conflicts
   */
  async monitorNPM() {
    console.log('🔍 Monitoring NPM...');
    const results = [];

    const npmPackageNames = ['rinawarp-terminal', 'rinawarp', 'rina-warp', 'rinawarp-cli'];

    try {
      for (const packageName of npmPackageNames) {
        try {
          const response = await axios.get(`https://registry.npmjs.org/${packageName}`);

          // Check if it's not our package
          if (response.data.author?.email !== 'support@rinawarp-terminal.web.app') {
            results.push({
              type: 'npm_package',
              packageName,
              url: `https://www.npmjs.com/package/${packageName}`,
              author: response.data.author,
              description: response.data.description,
              version: response.data['dist-tags']?.latest,
              downloads: response.data.downloads || 0,
              riskLevel: 'HIGH', // Unauthorized use of our name
            });
          }
        } catch (err) {
          if (err.response?.status === 404) {
            // Package doesn't exist - good for us to potentially register
            results.push({
              type: 'npm_available',
              packageName,
              status: 'available',
              recommendation: 'Consider registering this package name',
            });
          }
        }
      }
    } catch (error) {
      console.error('NPM monitoring error:', error.message);
    }

    return results;
  }

  /**
   * Monitor domain registrations
   */
  async monitorDomains() {
    console.log('🔍 Monitoring domains...');
    const results = [];

    // Note: In production, you'd use a domain monitoring service
    // This is a simplified implementation
    for (const domain of this.monitoredDomains) {
      try {
        // Simple check if domain resolves
        const response = await axios.get(`http://${domain}`, {
          timeout: 5000,
          validateStatus: () => true, // Don't throw on HTTP errors
        });

        results.push({
          type: 'domain_check',
          domain,
          status: response.status,
          accessible: response.status < 400,
          riskLevel: domain.includes('rinawarp') ? 'HIGH' : 'MEDIUM',
        });
      } catch (error) {
        results.push({
          type: 'domain_check',
          domain,
          status: 'unreachable',
          accessible: false,
          error: error.code,
        });
      }
    }

    return results;
  }

  /**
   * Check Google search results for mentions
   */
  async checkGoogleResults() {
    console.log('🔍 Checking Google mentions...');
    const results = [];

    // Note: In production, use Google Custom Search API
    // This is a simplified implementation
    try {
      for (const term of this.monitoredTerms) {
        if (this.config.googleApiKey) {
          const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: this.config.googleApiKey,
              cx: 'YOUR_SEARCH_ENGINE_ID', // Replace with actual CSE ID
              q: `"${term}" -site:github.com/Bigsgotchu -site:rinawarp-terminal.web.app`,
            },
          });

          for (const item of response.data.items || []) {
            results.push({
              type: 'google_mention',
              url: item.link,
              title: item.title,
              snippet: item.snippet,
              searchTerm: term,
              riskLevel: this.assessGoogleRisk(item, term),
            });
          }
        }
      }
    } catch (error) {
      console.error('Google search monitoring error:', error.message);
    }

    return results;
  }

  /**
   * Monitor social media for mentions
   */
  async monitorSocialMedia() {
    console.log('🔍 Monitoring social media...');
    const results = [];

    // Note: In production, integrate with Twitter API, Reddit API, etc.
    // This is a placeholder for social media monitoring
    results.push({
      type: 'social_media_placeholder',
      message: 'Social media monitoring requires API keys for Twitter, Reddit, etc.',
      recommendation: 'Set up social media monitoring APIs',
    });

    return results;
  }

  /**
   * Analyze scan results for potential violations
   */
  analyzeForViolations(scanResults) {
    const violations = [];

    // Check GitHub repositories
    for (const repo of scanResults.github) {
      if (repo.riskLevel === 'HIGH') {
        violations.push({
          type: 'trademark_violation',
          severity: 'HIGH',
          source: 'GitHub',
          url: repo.url,
          description: `Potential unauthorized use of "${repo.searchTerm}" in repository: ${repo.title}`,
          recommendation: 'Send DMCA takedown notice',
          evidence: repo,
        });
      }
    }

    // Check NPM packages
    for (const pkg of scanResults.npm) {
      if (pkg.type === 'npm_package') {
        violations.push({
          type: 'package_name_conflict',
          severity: 'HIGH',
          source: 'NPM',
          url: pkg.url,
          description: `Unauthorized use of package name: ${pkg.packageName}`,
          recommendation: 'Contact NPM support for trademark claim',
          evidence: pkg,
        });
      }
    }

    // Check domain violations
    for (const domain of scanResults.domains) {
      if (domain.accessible && domain.riskLevel === 'HIGH') {
        violations.push({
          type: 'domain_squatting',
          severity: 'HIGH',
          source: 'Domain',
          url: `http://${domain.domain}`,
          description: `Potential cybersquatting on domain: ${domain.domain}`,
          recommendation: 'File UDRP complaint or legal action',
          evidence: domain,
        });
      }
    }

    return violations;
  }

  /**
   * Assess GitHub repository risk level
   */
  assessGitHubRisk(repo, searchTerm) {
    // High risk indicators
    if (
      repo.name.toLowerCase().includes('rinawarp') ||
      repo.description?.toLowerCase().includes('rinawarp terminal')
    ) {
      return 'HIGH';
    }

    // Medium risk indicators
    if (
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.stargazers_count > 10
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Assess Google result risk level
   */
  assessGoogleRisk(item, searchTerm) {
    const title = item.title.toLowerCase();
    const snippet = item.snippet.toLowerCase();
    const term = searchTerm.toLowerCase();

    // High risk indicators
    if (
      title.includes(term) &&
      (snippet.includes('terminal') || snippet.includes('software') || snippet.includes('download'))
    ) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  /**
   * Store scan results to file
   */
  async storeScanResults(results) {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `monitoring-results-${timestamp}.json`;
      const filepath = path.join(process.cwd(), 'monitoring-logs', filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });

      await fs.writeFile(filepath, JSON.stringify(results, null, 2));
      console.log(`📄 Scan results saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to store scan results:', error.message);
    }
  }

  /**
   * Send violation alert email
   */
  async sendViolationAlert(violations) {
    if (!this.emailTransporter) {
      console.log('⚠️ Email not configured, violations logged only');
      return;
    }

    try {
      const emailBody = this.generateViolationEmailBody(violations);

      await this.emailTransporter.sendMail({
        from: this.config.emailConfig.user,
        to: this.config.alertRecipients.join(', '),
        subject: `🚨 RinaWarp IP Violation Alert - ${violations.length} violations detected`,
        html: emailBody,
      });

      console.log('📧 Violation alert email sent successfully');
    } catch (error) {
      console.error('Failed to send violation alert:', error.message);
    }
  }

  /**
   * Generate violation email body
   */
  generateViolationEmailBody(violations) {
    let html = `
        <h2>🚨 IP Violation Alert - RinaWarp Terminal</h2>
        <p><strong>Detected:</strong> ${new Date().toISOString()}</p>
        <p><strong>Total Violations:</strong> ${violations.length}</p>
        
        <h3>Violations Detected:</h3>
        `;

    for (const violation of violations) {
      html += `
            <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h4 style="color: ${violation.severity === 'HIGH' ? 'red' : 'orange'};">
                    ${violation.type.toUpperCase()} - ${violation.severity}
                </h4>
                <p><strong>Source:</strong> ${violation.source}</p>
                <p><strong>URL:</strong> <a href="${violation.url}">${violation.url}</a></p>
                <p><strong>Description:</strong> ${violation.description}</p>
                <p><strong>Recommended Action:</strong> ${violation.recommendation}</p>
            </div>
            `;
    }

    html += `
        <h3>Next Steps:</h3>
        <ol>
            <li>Review each violation carefully</li>
            <li>Document evidence for legal action</li>
            <li>Contact legal counsel if needed</li>
            <li>Send appropriate takedown notices</li>
            <li>Monitor for compliance</li>
        </ol>
        
        <p><em>This alert was generated automatically by RinaWarp IP Monitoring System</em></p>
        `;

    return html;
  }

  /**
   * Manual scan trigger
   */
  async triggerManualScan() {
    console.log('🔍 Manual monitoring scan triggered...');
    return await this.runFullMonitoringScan();
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    return {
      lastScan: this.lastScanResults.timestamp,
      totalViolations: this.violations.length,
      monitoredTerms: this.monitoredTerms.length,
      monitoredDomains: this.monitoredDomains.length,
      scanInterval: this.config.monitoringInterval,
    };
  }

  /**
   * Add new monitoring term
   */
  addMonitoringTerm(term) {
    if (!this.monitoredTerms.includes(term)) {
      this.monitoredTerms.push(term);
      console.log(`➕ Added monitoring term: ${term}`);
    }
  }

  /**
   * Add new monitoring domain
   */
  addMonitoringDomain(domain) {
    if (!this.monitoredDomains.includes(domain)) {
      this.monitoredDomains.push(domain);
      console.log(`➕ Added monitoring domain: ${domain}`);
    }
  }
}

export default IPMonitoringSystem;
