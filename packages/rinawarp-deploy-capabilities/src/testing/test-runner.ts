/**
 * Deployment Test Runner
 * 
 * This module provides a CLI interface for running deployment acceptance tests
 * and generating comprehensive reports.
 */

import { DeploymentAcceptanceSuite, AcceptanceTestResult, SecretValidationTestResult } from './deployment-acceptance'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Test Runner Configuration
 */
export interface TestRunnerConfig {
  /** Enable verbose logging */
  verbose?: boolean
  /** Skip tests that require real credentials */
  skipRealTests?: boolean
  /** Only run specific platforms */
  platforms?: string[]
  /** Output directory for reports */
  outputDir?: string
  /** Generate HTML report */
  generateHtml?: boolean
}

/**
 * Test Run Result
 */
export interface TestRunResult {
  startTime: string
  durationMs: number
  results: AcceptanceTestResult[]
  secretValidationResult: SecretValidationTestResult | null
  summary: TestSummary
}

/**
 * Test Summary
 */
export interface TestSummary {
  totalPlatforms: number
  passedPlatforms: number
  failedPlatforms: string[]
  totalSteps: number
  passedSteps: number
  secretValidationPassed: boolean
  overallSuccess: boolean
}

/**
 * Test Runner
 */
export class DeploymentTestRunner {
  private suite: DeploymentAcceptanceSuite
  private config: TestRunnerConfig

  constructor(config: TestRunnerConfig = {}) {
    this.suite = new DeploymentAcceptanceSuite()
    this.config = {
      verbose: false,
      skipRealTests: false,
      platforms: [],
      outputDir: './test-reports',
      generateHtml: true,
      ...config
    }
  }

  /**
   * Run all acceptance tests
   */
  async runTests(): Promise<TestRunResult> {
    const startTime = Date.now()
    
    if (this.config.verbose) {
      console.log('🚀 Starting RinaWarp Deployment Acceptance Tests')
      console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`)
    }

    const results: AcceptanceTestResult[] = []
    let secretValidationResult: SecretValidationTestResult | null = null

    try {
      // Test 1: Secret validation failure path
      if (this.config.verbose) {
        console.log('🔒 Testing secret validation failure path...')
      }
      
      secretValidationResult = await this.suite.testSecretValidationFailure()
      
      if (this.config.verbose) {
        console.log(`✅ Secret validation test: ${secretValidationResult.passed ? 'PASSED' : 'FAILED'}`)
      }

      // Test 2: Platform deployments
      if (!this.config.skipRealTests) {
        if (this.config.verbose) {
          console.log('🌐 Testing platform deployments...')
        }
        
        const platformResults = await this.suite.runAllTests()
        
        // Filter results if specific platforms requested
        let filteredResults = platformResults
        if (this.config.platforms && this.config.platforms.length > 0) {
          filteredResults = platformResults.filter(r => 
            this.config.platforms?.includes(r.platform)
          )
        }
        
        results.push(...filteredResults)
        
        if (this.config.verbose) {
          const passed = filteredResults.filter(r => r.passed).length
          const total = filteredResults.length
          console.log(`✅ Platform tests: ${passed}/${total} passed`)
        }
      } else {
        if (this.config.verbose) {
          console.log('⏭️ Skipping real platform tests (skipRealTests enabled)')
        }
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error)
      throw error
    }

    const durationMs = Date.now() - startTime

    const testRunResult: TestRunResult = {
      startTime: new Date(startTime).toISOString(),
      durationMs,
      results,
      secretValidationResult,
      summary: this.generateSummary(results, secretValidationResult)
    }

    // Generate reports
    await this.generateReports(testRunResult)

    return testRunResult
  }

  /**
   * Generate test summary
   */
  public generateSummary(
    results: AcceptanceTestResult[], 
    secretValidationResult: SecretValidationTestResult | null
  ): TestSummary {
    const totalPlatforms = results.length
    const passedPlatforms = results.filter(r => r.passed).length
    const failedPlatforms = results.filter(r => !r.passed)
    
    const totalSteps = results.reduce((sum, r) => sum + r.steps.length, 0)
    const passedSteps = results.reduce((sum, r) => sum + r.steps.filter(s => s.passed).length, 0)

    return {
      totalPlatforms,
      passedPlatforms,
      failedPlatforms: failedPlatforms.map(r => r.platform),
      totalSteps,
      passedSteps,
      secretValidationPassed: secretValidationResult?.passed || false,
      overallSuccess: passedPlatforms === totalPlatforms && (secretValidationResult?.passed || false)
    }
  }

  /**
   * Generate test reports
   */
  private async generateReports(result: TestRunResult): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true })
    }

    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport(result)
    const markdownPath = path.join(this.config.outputDir!, 'acceptance-test-report.md')
    fs.writeFileSync(markdownPath, markdownReport)

    if (this.config.generateHtml) {
      // Generate HTML report
      const htmlReport = this.generateHtmlReport(result)
      const htmlPath = path.join(this.config.outputDir!, 'acceptance-test-report.html')
      fs.writeFileSync(htmlPath, htmlReport)
    }

    // Generate JSON report
    const jsonReport = JSON.stringify(result, null, 2)
    const jsonPath = path.join(this.config.outputDir!, 'acceptance-test-report.json')
    fs.writeFileSync(jsonPath, jsonReport)

    if (this.config.verbose) {
      console.log(`📄 Reports generated in ${this.config.outputDir}`)
    }
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(result: TestRunResult): string {
    const { summary } = result
    const passed = summary.passedPlatforms
    const total = summary.totalPlatforms

    let report = `# RinaWarp Deployment Acceptance Test Report\n\n`
    report += `**Date**: ${result.startTime}\n`
    report += `**Duration**: ${result.durationMs}ms\n`
    report += `**Overall Success**: ${summary.overallSuccess ? '✅ YES' : '❌ NO'}\n\n`

    report += `## Summary\n\n`
    report += `- **Platforms Tested**: ${total}\n`
    report += `- **Platforms Passed**: ${passed}\n`
    report += `- **Platforms Failed**: ${summary.failedPlatforms.length}\n`
    report += `- **Steps Executed**: ${summary.totalSteps}\n`
    report += `- **Steps Passed**: ${summary.passedSteps}\n`
    report += `- **Secret Validation**: ${summary.secretValidationPassed ? '✅ PASSED' : '❌ FAILED'}\n\n`

    if (summary.failedPlatforms.length > 0) {
      report += `## Failed Platforms\n\n`
      for (const platform of summary.failedPlatforms) {
        report += `- ❌ ${platform}\n`
      }
      report += `\n`
    }

    report += `## Platform Details\n\n`
    
    for (const platformResult of result.results) {
      const status = platformResult.passed ? '✅ PASS' : '❌ FAIL'
      report += `### ${platformResult.platform.toUpperCase()}: ${status}\n\n`
      
      if (platformResult.error) {
        report += `**Error**: ${platformResult.error}\n\n`
      }
      
      report += `**Steps**:\n`
      for (const step of platformResult.steps) {
        const stepStatus = step.passed ? '✅' : '❌'
        report += `- ${stepStatus} ${step.name} (${step.durationMs}ms)\n`
      }
      
      if (platformResult.receipt) {
        report += `\n**Deployment Receipt**:\n`
        report += `- Status: ${platformResult.receipt.status}\n`
        report += `- Target URL: ${platformResult.receipt.targetUrl || 'N/A'}\n`
        report += `- Duration: ${platformResult.receipt.durationMs}ms\n`
        report += `- Build ID: ${platformResult.receipt.buildId || 'N/A'}\n`
      }
      
      report += `\n---\n\n`
    }

    if (result.secretValidationResult) {
      report += `## Secret Validation Test\n\n`
      report += `**Status**: ${result.secretValidationResult.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`
      report += `**Steps**:\n`
      for (const step of result.secretValidationResult.steps) {
        const stepStatus = step.passed ? '✅' : '❌'
        report += `- ${stepStatus} ${step.name} (${step.durationMs}ms)\n`
      }
      if (result.secretValidationResult.errorMessage) {
        report += `\n**Error Message**: ${result.secretValidationResult.errorMessage}\n`
      }
    }

    return report
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(result: TestRunResult): string {
    const { summary } = result
    const passed = summary.passedPlatforms
    const total = summary.totalPlatforms

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Deployment Acceptance Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
        .metric h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #6c757d; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .platform { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .platform-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .platform-name { font-size: 18px; font-weight: bold; }
        .platform-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-pass { background: #d4edda; color: #155724; }
        .status-fail { background: #f8d7da; color: #721c24; }
        .steps { margin-top: 15px; }
        .step { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .step:last-child { border-bottom: none; }
        .step-icon { margin-right: 10px; font-size: 16px; }
        .step-name { flex-grow: 1; }
        .step-duration { color: #6c757d; font-size: 12px; }
        .receipt { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 15px; }
        .receipt h4 { margin: 0 0 10px 0; font-size: 14px; }
        .receipt-item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; color: #6c757d; margin-top: 30px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RinaWarp Deployment Acceptance Test Report</h1>
        <p><strong>Date:</strong> ${result.startTime}</p>
        <p><strong>Duration:</strong> ${result.durationMs}ms</p>
        <p><strong>Overall Success:</strong> <span class="${summary.overallSuccess ? 'success' : 'danger'}">${summary.overallSuccess ? '✅ YES' : '❌ NO'}</span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Platforms Tested</h3>
            <div class="value">${total}</div>
        </div>
        <div class="metric">
            <h3>Platforms Passed</h3>
            <div class="value success">${passed}</div>
        </div>
        <div class="metric">
            <h3>Platforms Failed</h3>
            <div class="value ${summary.failedPlatforms.length > 0 ? 'danger' : 'success'}">${summary.failedPlatforms.length}</div>
        </div>
        <div class="metric">
            <h3>Steps Executed</h3>
            <div class="value">${summary.totalSteps}</div>
        </div>
        <div class="metric">
            <h3>Steps Passed</h3>
            <div class="value ${summary.passedSteps === summary.totalSteps ? 'success' : 'warning'}">${summary.passedSteps}</div>
        </div>
        <div class="metric">
            <h3>Secret Validation</h3>
            <div class="value ${summary.secretValidationPassed ? 'success' : 'danger'}">${summary.secretValidationPassed ? '✅ PASSED' : '❌ FAILED'}</div>
        </div>
    </div>

    ${summary.failedPlatforms.length > 0 ? `
    <div class="platform">
        <div class="platform-header">
            <div class="platform-name">Failed Platforms</div>
        </div>
        ${summary.failedPlatforms.map(platform => `<div class="error">❌ ${platform}</div>`).join('')}
    </div>
    ` : ''}

    ${result.results.map(platformResult => `
    <div class="platform">
        <div class="platform-header">
            <div class="platform-name">${platformResult.platform.toUpperCase()}</div>
            <div class="platform-status ${platformResult.passed ? 'status-pass' : 'status-fail'}">${platformResult.passed ? 'PASS' : 'FAIL'}</div>
        </div>
        
        ${platformResult.error ? `<div class="error">Error: ${platformResult.error}</div>` : ''}
        
        <div class="steps">
            ${platformResult.steps.map(step => `
            <div class="step">
                <span class="step-icon">${step.passed ? '✅' : '❌'}</span>
                <span class="step-name">${step.name}</span>
                <span class="step-duration">${step.durationMs}ms</span>
            </div>
            `).join('')}
        </div>

        ${platformResult.receipt ? `
        <div class="receipt">
            <h4>Deployment Receipt</h4>
            <div class="receipt-item">
                <span>Status</span>
                <span>${platformResult.receipt.status}</span>
            </div>
            <div class="receipt-item">
                <span>Target URL</span>
                <span>${platformResult.receipt.targetUrl || 'N/A'}</span>
            </div>
            <div class="receipt-item">
                <span>Duration</span>
                <span>${platformResult.receipt.durationMs}ms</span>
            </div>
            <div class="receipt-item">
                <span>Build ID</span>
                <span>${platformResult.receipt.buildId || 'N/A'}</span>
            </div>
        </div>
        ` : ''}
    </div>
    `).join('')}

    ${result.secretValidationResult ? `
    <div class="platform">
        <div class="platform-header">
            <div class="platform-name">Secret Validation Test</div>
            <div class="platform-status ${result.secretValidationResult.passed ? 'status-pass' : 'status-fail'}">${result.secretValidationResult.passed ? 'PASS' : 'FAIL'}</div>
        </div>
        
        <div class="steps">
            ${result.secretValidationResult.steps.map(step => `
            <div class="step">
                <span class="step-icon">${step.passed ? '✅' : '❌'}</span>
                <span class="step-name">${step.name}</span>
                <span class="step-duration">${step.durationMs}ms</span>
            </div>
            `).join('')}
        </div>

        ${result.secretValidationResult.errorMessage ? `
        <div class="error">Error Message: ${result.secretValidationResult.errorMessage}</div>
        ` : ''}
    </div>
    ` : ''}

    <div class="footer">
        Generated by RinaWarp Deployment Acceptance Test Suite
    </div>
</body>
</html>`
  }

  /**
   * CLI interface
   */
  static async runFromCLI(): Promise<void> {
    const args = process.argv.slice(2)
    const config: TestRunnerConfig = {}

    // Parse CLI arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      switch (arg) {
        case '--verbose':
        case '-v':
          config.verbose = true
          break
        case '--skip-real-tests':
          config.skipRealTests = true
          break
        case '--platforms':
          config.platforms = args[++i]?.split(',') || []
          break
        case '--output-dir':
          config.outputDir = args[++i]
          break
        case '--no-html':
          config.generateHtml = false
          break
        case '--help':
        case '-h':
          console.log(`
RinaWarp Deployment Acceptance Test Runner

Usage: node test-runner.js [options]

Options:
  -v, --verbose           Enable verbose logging
  --skip-real-tests       Skip tests that require real credentials
  --platforms <list>      Only run specific platforms (comma-separated)
  --output-dir <dir>      Output directory for reports
  --no-html              Don't generate HTML report
  -h, --help             Show this help message

Examples:
  node test-runner.js --verbose
  node test-runner.js --platforms vercel,netlify
  node test-runner.js --skip-real-tests --output-dir ./reports
          `)
          process.exit(0)
      }
    }

    const runner = new DeploymentTestRunner(config)
    
    try {
      const result = await runner.runTests()
      
      if (result.summary.overallSuccess) {
        console.log('🎉 All tests passed!')
        process.exit(0)
      } else {
        console.log('❌ Some tests failed')
        process.exit(1)
      }
    } catch (error) {
      console.error('💥 Test runner failed:', error)
      process.exit(1)
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  DeploymentTestRunner.runFromCLI()
}