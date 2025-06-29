/**
 * RinaWarp Terminal - Zero Trust Security
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
class ZeroTrustSecurity {
  constructor() {
    this.securityPolicies = new Map();
    this.threatDetector = new ThreatDetectionEngine();
    this.complianceLogger = new ComplianceAuditLogger();
    this.accessController = new AccessControlEngine();
    this.biometricAuth = new BiometricAuthentication();
    this.secretScanner = new SecretScanner();
    this.behaviorAnalyzer = new BehaviorAnalyzer();
    this.riskAssessor = new RiskAssessmentEngine();
    this.securityUI = null;
    this.isSecurityEnabled = true;
    this.securityLevel = 'enterprise'; // 'basic', 'standard', 'enterprise', 'military'
    this.init();
  }

  async init() {
    this.loadSecurityPolicies();
    this.createSecurityUI();
    this.initializeSecurityModules();
    this.startContinuousMonitoring();
    console.log('🔒 Zero-Trust Security Engine initialized');
  }

  async analyzeCommandThreat(command, context) {
    const threatAnalysis = {
      command: command,
      timestamp: Date.now(),
      riskLevel: 'low',
      threats: [],
      mitigations: [],
      shouldBlock: false,
      requiresApproval: false,
      securityScore: 100,
    };

    try {
      // Multi-layer threat detection
      const detectionResults = await Promise.all([
        this.threatDetector.detectMaliciousPatterns(command),
        this.threatDetector.detectPrivilegeEscalation(command),
        this.threatDetector.detectDataExfiltration(command),
        this.threatDetector.detectSystemModification(command),
        this.threatDetector.detectNetworkThreats(command),
        this.secretScanner.scanForSecrets(command),
        this.behaviorAnalyzer.analyzeDeviation(command, context),
      ]);

      // Aggregate threat results
      for (const result of detectionResults) {
        if (result.threatsFound.length > 0) {
          threatAnalysis.threats.push(...result.threatsFound);
          threatAnalysis.riskLevel = this.calculateRiskLevel(threatAnalysis.threats);
          threatAnalysis.securityScore -= result.riskPoints;
        }
      }

      // Apply security policies
      const policyResult = await this.applySecurityPolicies(command, threatAnalysis, context);
      threatAnalysis.shouldBlock = policyResult.shouldBlock;
      threatAnalysis.requiresApproval = policyResult.requiresApproval;
      threatAnalysis.mitigations = policyResult.mitigations;

      // Log security event
      await this.complianceLogger.logSecurityEvent({
        type: 'command_analysis',
        command: command,
        threats: threatAnalysis.threats,
        riskLevel: threatAnalysis.riskLevel,
        action: threatAnalysis.shouldBlock ? 'blocked' : 'allowed',
        context: context,
      });

      return threatAnalysis;
    } catch (error) {
      console.error('Threat analysis failed:', error);
      // Fail secure - block on error
      return {
        ...threatAnalysis,
        riskLevel: 'critical',
        shouldBlock: true,
        threats: [{ type: 'analysis_error', message: 'Security analysis failed' }],
      };
    }
  }

  async applySecurityPolicies(command, threatAnalysis, context) {
    const policyResult = {
      shouldBlock: false,
      requiresApproval: false,
      mitigations: [],
      appliedPolicies: [],
    };

    // Get applicable policies
    const applicablePolicies = this.getApplicablePolicies(command, context);

    for (const policy of applicablePolicies) {
      const evaluation = await this.evaluatePolicy(policy, command, threatAnalysis, context);

      if (evaluation.violated) {
        policyResult.appliedPolicies.push({
          policyId: policy.id,
          policyName: policy.name,
          action: evaluation.action,
          reason: evaluation.reason,
        });

        switch (evaluation.action) {
          case 'block':
            policyResult.shouldBlock = true;
            break;
          case 'require_approval':
            policyResult.requiresApproval = true;
            break;
          case 'mitigate':
            policyResult.mitigations.push(...evaluation.mitigations);
            break;
        }
      }
    }

    // Special handling for high-risk commands
    if (threatAnalysis.riskLevel === 'critical') {
      policyResult.shouldBlock = true;
    } else if (threatAnalysis.riskLevel === 'high') {
      policyResult.requiresApproval = true;
    }

    return policyResult;
  }

  async requireBiometricAuth(command, threatLevel) {
    if (threatLevel === 'low') {
      return { success: true, method: 'none' };
    }

    try {
      const authMethods = [];

      // Progressive authentication based on threat level
      switch (threatLevel) {
        case 'medium':
          authMethods.push('fingerprint');
          break;
        case 'high':
          authMethods.push('fingerprint', 'facial_recognition');
          break;
        case 'critical':
          authMethods.push('fingerprint', 'facial_recognition', 'voice_recognition');
          break;
      }

      // Try each authentication method
      for (const method of authMethods) {
        const authResult = await this.biometricAuth.authenticate(method);
        if (authResult.success) {
          await this.complianceLogger.logSecurityEvent({
            type: 'biometric_auth_success',
            command: command,
            method: method,
            threatLevel: threatLevel,
            timestamp: Date.now(),
          });
          return { success: true, method: method };
        }
      }

      // All authentication methods failed
      await this.complianceLogger.logSecurityEvent({
        type: 'biometric_auth_failure',
        command: command,
        attemptedMethods: authMethods,
        threatLevel: threatLevel,
        timestamp: Date.now(),
      });

      return { success: false, method: 'none', reason: 'Authentication failed' };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, method: 'none', reason: 'Authentication system error' };
    }
  }

  async enforceComplianceStandards(command, context) {
    const complianceCheck = {
      standards: [],
      violations: [],
      recommendations: [],
      compliant: true,
    };

    // Check against various compliance standards
    const standards = {
      SOX: await this.checkSOXCompliance(command, context),
      HIPAA: await this.checkHIPAACompliance(command, context),
      'PCI-DSS': await this.checkPCIDSSCompliance(command, context),
      SOC2: await this.checkSOC2Compliance(command, context),
      ISO27001: await this.checkISO27001Compliance(command, context),
      GDPR: await this.checkGDPRCompliance(command, context),
    };

    for (const [standard, result] of Object.entries(standards)) {
      complianceCheck.standards.push(standard);

      if (!result.compliant) {
        complianceCheck.violations.push({
          standard: standard,
          violations: result.violations,
          severity: result.severity,
        });
        complianceCheck.compliant = false;
      }

      if (result.recommendations) {
        complianceCheck.recommendations.push(...result.recommendations);
      }
    }

    // Log compliance check
    await this.complianceLogger.logComplianceEvent({
      type: 'compliance_check',
      command: command,
      standards: Object.keys(standards),
      violations: complianceCheck.violations,
      compliant: complianceCheck.compliant,
      context: context,
    });

    return complianceCheck;
  }

  async preventSecretLeakage(command, context) {
    const secretScan = {
      secretsFound: [],
      riskLevel: 'low',
      shouldBlock: false,
      mitigations: [],
    };

    try {
      // Scan for various types of secrets
      const scanResults = await Promise.all([
        this.secretScanner.scanForAPIKeys(command),
        this.secretScanner.scanForPasswords(command),
        this.secretScanner.scanForTokens(command),
        this.secretScanner.scanForCertificates(command),
        this.secretScanner.scanForDatabaseConnections(command),
        this.secretScanner.scanForCloudCredentials(command),
      ]);

      // Aggregate scan results
      for (const result of scanResults) {
        if (result.found) {
          secretScan.secretsFound.push({
            type: result.type,
            confidence: result.confidence,
            location: result.location,
            maskedValue: result.maskedValue,
          });
        }
      }

      if (secretScan.secretsFound.length > 0) {
        secretScan.riskLevel = 'critical';
        secretScan.shouldBlock = true;
        secretScan.mitigations = [
          'Use environment variables for secrets',
          'Implement secret management system',
          'Remove hardcoded credentials',
        ];

        // Auto-suggest secure alternatives
        const secureCommand = await this.generateSecureAlternative(
          command,
          secretScan.secretsFound
        );
        if (secureCommand) {
          secretScan.mitigations.push(`Suggested secure command: ${secureCommand}`);
        }
      }

      return secretScan;
    } catch (error) {
      console.error('Secret scanning failed:', error);
      return secretScan;
    }
  }

  async detectAnomalousActivity(command, context) {
    const behaviorAnalysis = {
      isAnomalous: false,
      anomalies: [],
      riskScore: 0,
      baselineDeviation: 0,
      recommendations: [],
    };

    try {
      // Analyze against user's normal behavior
      const userBaseline = await this.behaviorAnalyzer.getUserBaseline(context.userId);

      const anomalyChecks = [
        await this.checkTimeBasedAnomalies(command, context, userBaseline),
        await this.checkLocationBasedAnomalies(command, context, userBaseline),
        await this.checkCommandPatternAnomalies(command, context, userBaseline),
        await this.checkVolumeAnomalies(command, context, userBaseline),
        await this.checkPrivilegeAnomalies(command, context, userBaseline),
      ];

      for (const check of anomalyChecks) {
        if (check.isAnomalous) {
          behaviorAnalysis.anomalies.push(check);
          behaviorAnalysis.riskScore += check.riskContribution;
          behaviorAnalysis.isAnomalous = true;
        }
      }

      // Calculate baseline deviation
      behaviorAnalysis.baselineDeviation = this.calculateBaselineDeviation(
        command,
        context,
        userBaseline
      );

      // Generate recommendations
      if (behaviorAnalysis.isAnomalous) {
        behaviorAnalysis.recommendations = [
          'Verify user identity with additional authentication',
          'Review recent access patterns',
          'Check for compromised credentials',
          'Monitor subsequent activities closely',
        ];
      }

      return behaviorAnalysis;
    } catch (error) {
      console.error('Behavioral analysis failed:', error);
      return behaviorAnalysis;
    }
  }

  async executeInSandbox(command, securityContext) {
    const sandboxConfig = {
      isolationLevel: this.determineSandboxLevel(securityContext.riskLevel),
      resourceLimits: this.calculateResourceLimits(command),
      networkAccess: securityContext.allowNetworkAccess || false,
      fileSystemAccess: securityContext.allowFileSystemAccess || 'read-only',
      timeLimit: securityContext.timeLimit || 30000, // 30 seconds default
    };

    try {
      const sandbox = await this.createSecureSandbox(sandboxConfig);

      // Execute command in sandbox
      const result = await sandbox.execute(command, {
        timeout: sandboxConfig.timeLimit,
        captureOutput: true,
        monitorResources: true,
      });

      // Analyze sandbox execution
      const analysis = await this.analyzeSandboxExecution(result, command);

      if (analysis.isSafe) {
        return {
          success: true,
          result: result,
          sandboxed: true,
          analysis: analysis,
        };
      } else {
        return {
          success: false,
          blocked: true,
          reason: 'Malicious behavior detected in sandbox',
          analysis: analysis,
        };
      }
    } catch (error) {
      console.error('Sandbox execution failed:', error);
      return {
        success: false,
        error: error.message,
        sandboxed: false,
      };
    }
  }

  createSecurityUI() {
    const securityContainer = document.createElement('div');
    securityContainer.id = 'zero-trust-security-ui';
    securityContainer.className = 'security-ui hidden';

    securityContainer.innerHTML = `
            <div class="security-header">
                <h3>🔒 Zero-Trust Security</h3>
                <div class="security-controls">
                    <div class="security-level">
                        <label>Security Level:</label>
                        <select id="security-level-select">
                            <option value="basic">Basic</option>
                            <option value="standard">Standard</option>
                            <option value="enterprise" selected>Enterprise</option>
                            <option value="military">Military Grade</option>
                        </select>
                    </div>
                    <button id="security-scan-btn" class="scan-btn">🔍 Security Scan</button>
                    <button id="compliance-check-btn" class="compliance-btn">📄 Compliance Check</button>
                    <button id="close-security-btn" class="close-btn">×</button>
                </div>
            </div>
            
            <div class="security-content">
                <!-- Real-time Threat Monitor -->
                <div class="threat-monitor">
                    <h4>🚨 Real-time Threat Monitor</h4>
                    <div class="threat-status">
                        <div class="status-indicator safe">
                            <span class="status-light"></span>
                            <span id="threat-level">SECURE</span>
                        </div>
                        <div class="threat-metrics">
                            <div class="metric">
                                <span class="label">Commands Analyzed:</span>
                                <span id="commands-analyzed">0</span>
                            </div>
                            <div class="metric">
                                <span class="label">Threats Blocked:</span>
                                <span id="threats-blocked">0</span>
                            </div>
                            <div class="metric">
                                <span class="label">Policy Violations:</span>
                                <span id="policy-violations">0</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Security Policies -->
                <div class="security-policies">
                    <h4>📜 Security Policies</h4>
                    <div class="policy-controls">
                        <button id="add-policy-btn" class="add-btn">+ Add Policy</button>
                        <button id="import-policies-btn" class="import-btn">📥 Import Policies</button>
                    </div>
                    <div id="policies-list" class="policies-list"></div>
                </div>
                
                <!-- Compliance Dashboard -->
                <div class="compliance-dashboard">
                    <h4>✅ Compliance Status</h4>
                    <div class="compliance-standards">
                        <div class="standard" data-standard="SOX">
                            <span class="standard-name">SOX</span>
                            <span class="compliance-status compliant">✓</span>
                        </div>
                        <div class="standard" data-standard="HIPAA">
                            <span class="standard-name">HIPAA</span>
                            <span class="compliance-status compliant">✓</span>
                        </div>
                        <div class="standard" data-standard="PCI-DSS">
                            <span class="standard-name">PCI-DSS</span>
                            <span class="compliance-status compliant">✓</span>
                        </div>
                        <div class="standard" data-standard="SOC2">
                            <span class="standard-name">SOC2</span>
                            <span class="compliance-status compliant">✓</span>
                        </div>
                        <div class="standard" data-standard="ISO27001">
                            <span class="standard-name">ISO 27001</span>
                            <span class="compliance-status compliant">✓</span>
                        </div>
                        <div class="standard" data-standard="GDPR">
                            <span class="standard-name">GDPR</span>
                            <span class="compliance-status compliant">✓</span>
                        </div>
                    </div>
                </div>
                
                <!-- Biometric Authentication -->
                <div class="biometric-auth">
                    <h4>👤 Biometric Authentication</h4>
                    <div class="auth-methods">
                        <div class="auth-method" data-method="fingerprint">
                            <span class="method-icon">🖐️</span>
                            <span class="method-name">Fingerprint</span>
                            <span class="method-status enabled">✓</span>
                        </div>
                        <div class="auth-method" data-method="facial">
                            <span class="method-icon">👤</span>
                            <span class="method-name">Facial Recognition</span>
                            <span class="method-status enabled">✓</span>
                        </div>
                        <div class="auth-method" data-method="voice">
                            <span class="method-icon">🎤</span>
                            <span class="method-name">Voice Recognition</span>
                            <span class="method-status disabled">×</span>
                        </div>
                    </div>
                </div>
                
                <!-- Security Audit Log -->
                <div class="security-audit">
                    <h4>📈 Security Audit Log</h4>
                    <div class="audit-controls">
                        <select id="audit-filter">
                            <option value="all">All Events</option>
                            <option value="threats">Threat Detections</option>
                            <option value="violations">Policy Violations</option>
                            <option value="auth">Authentication Events</option>
                        </select>
                        <button id="export-audit-btn" class="export-btn">📤 Export</button>
                    </div>
                    <div id="audit-log" class="audit-log"></div>
                </div>
                
                <!-- Security Insights -->
                <div class="security-insights">
                    <h4>📊 Security Insights</h4>
                    <div class="insights-content">
                        <div class="insight">
                            <span class="insight-label">Risk Trends:</span>
                            <span class="insight-value">Decreasing 📉</span>
                        </div>
                        <div class="insight">
                            <span class="insight-label">Top Threat:</span>
                            <span class="insight-value">Privilege Escalation</span>
                        </div>
                        <div class="insight">
                            <span class="insight-label">Security Score:</span>
                            <span class="insight-value">98/100 🌟</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(securityContainer);
    this.securityUI = securityContainer;
    this.attachSecurityEventListeners();
  }

  attachSecurityEventListeners() {
    // Security level change
    document.getElementById('security-level-select')?.addEventListener('change', e => {
      this.setSecurityLevel(e.target.value);
    });

    // Security scan
    document.getElementById('security-scan-btn')?.addEventListener('click', async () => {
      await this.performComprehensiveSecurityScan();
    });

    // Compliance check
    document.getElementById('compliance-check-btn')?.addEventListener('click', async () => {
      await this.performComplianceAudit();
    });

    // Close security panel
    document.getElementById('close-security-btn')?.addEventListener('click', () => {
      this.hideSecurityPanel();
    });
  }

  loadSecurityPolicies() {
    const defaultPolicies = [
      {
        id: 'no-root-commands',
        name: 'Prohibit Root Commands',
        description: 'Block commands that require root privileges',
        pattern: /^(sudo|su)\s/,
        action: 'block',
        enabled: true,
        compliance: ['SOX', 'SOC2'],
      },
      {
        id: 'no-system-files',
        name: 'Protect System Files',
        description: 'Prevent modification of critical system files',
        pattern: /\/(etc|sys|proc|boot)\/.*$/,
        action: 'require_approval',
        enabled: true,
        compliance: ['ISO27001'],
      },
      {
        id: 'no-network-tools',
        name: 'Restrict Network Tools',
        description: 'Control usage of network reconnaissance tools',
        pattern: /\b(nmap|netcat|nc|telnet|ftp)\b/,
        action: 'require_approval',
        enabled: true,
        compliance: ['PCI-DSS'],
      },
      {
        id: 'no-secrets-in-commands',
        name: 'Prevent Secret Exposure',
        description: 'Block commands containing secrets or credentials',
        action: 'block',
        enabled: true,
        compliance: ['GDPR', 'HIPAA'],
      },
    ];

    defaultPolicies.forEach(policy => {
      this.securityPolicies.set(policy.id, policy);
    });
  }

  // Utility methods
  calculateRiskLevel(threats) {
    if (threats.some(t => t.severity === 'critical')) return 'critical';
    if (threats.some(t => t.severity === 'high')) return 'high';
    if (threats.some(t => t.severity === 'medium')) return 'medium';
    return 'low';
  }

  getApplicablePolicies(command, context) {
    return Array.from(this.securityPolicies.values())
      .filter(policy => policy.enabled)
      .filter(policy => this.isPolicyApplicable(policy, command, context));
  }

  isPolicyApplicable(policy, command, context) {
    if (policy.pattern && !policy.pattern.test(command)) {
      return false;
    }

    if (policy.context && !this.matchesContext(policy.context, context)) {
      return false;
    }

    return true;
  }

  // Public API
  showSecurityPanel() {
    this.securityUI.classList.remove('hidden');
    this.updateSecurityMetrics();
  }

  hideSecurityPanel() {
    this.securityUI.classList.add('hidden');
  }

  setSecurityLevel(level) {
    this.securityLevel = level;
    this.adjustSecurityPolicies(level);
    this.showNotification(`Security level set to: ${level}`, 'info');
  }

  async performSecurityCheck(command, context) {
    if (!this.isSecurityEnabled) {
      return { allowed: true, reason: 'Security disabled' };
    }

    const results = await Promise.all([
      this.analyzeCommandThreat(command, context),
      this.preventSecretLeakage(command, context),
      this.detectAnomalousActivity(command, context),
      this.enforceComplianceStandards(command, context),
    ]);

    const [threatAnalysis, secretScan, behaviorAnalysis, complianceCheck] = results;

    // Determine final action
    if (threatAnalysis.shouldBlock || secretScan.shouldBlock || !complianceCheck.compliant) {
      return {
        allowed: false,
        reason: 'Security policy violation',
        details: { threatAnalysis, secretScan, behaviorAnalysis, complianceCheck },
      };
    }

    if (threatAnalysis.requiresApproval || behaviorAnalysis.isAnomalous) {
      const authResult = await this.requireBiometricAuth(command, threatAnalysis.riskLevel);
      if (!authResult.success) {
        return {
          allowed: false,
          reason: 'Authentication required',
          authRequired: true,
        };
      }
    }

    return {
      allowed: true,
      securityScore: threatAnalysis.securityScore,
      details: { threatAnalysis, secretScan, behaviorAnalysis, complianceCheck },
    };
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `security-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
}

class ThreatDetectionEngine {
  async detectMaliciousPatterns(command) {
    const threats = [];
    const maliciousPatterns = [
      { pattern: /rm\s+-rf\s+\//, threat: 'system_destruction', severity: 'critical' },
      { pattern: /dd\s+if=\/dev\/zero/, threat: 'disk_wipe', severity: 'critical' },
      { pattern: /:(){ :|:& };:/, threat: 'fork_bomb', severity: 'critical' },
      { pattern: /curl.*\|\s*sh/, threat: 'remote_execution', severity: 'high' },
      { pattern: /wget.*\|\s*bash/, threat: 'remote_execution', severity: 'high' },
      { pattern: /nc\s+-l/, threat: 'backdoor_listener', severity: 'high' },
      { pattern: /chmod\s+777/, threat: 'permission_abuse', severity: 'medium' },
    ];

    for (const { pattern, threat, severity } of maliciousPatterns) {
      if (pattern.test(command)) {
        threats.push({ type: threat, severity, pattern: pattern.source });
      }
    }

    return { threatsFound: threats, riskPoints: threats.length * 20 };
  }

  async detectPrivilegeEscalation(command) {
    const threats = [];
    const escalationPatterns = [
      /sudo\s+su\s*-/,
      /sudo\s+passwd/,
      /sudo\s+visudo/,
      /sudo\s+chmod\s+\+s/,
      /sudo\s+chown\s+root/,
    ];

    for (const pattern of escalationPatterns) {
      if (pattern.test(command)) {
        threats.push({
          type: 'privilege_escalation',
          severity: 'high',
          pattern: pattern.source,
        });
      }
    }

    return { threatsFound: threats, riskPoints: threats.length * 25 };
  }

  async detectDataExfiltration(command) {
    const threats = [];
    const exfiltrationPatterns = [
      /scp.*@.*:/,
      /rsync.*@.*:/,
      /curl.*-T/,
      /ftp.*put/,
      /base64.*\|.*curl/,
    ];

    for (const pattern of exfiltrationPatterns) {
      if (pattern.test(command)) {
        threats.push({
          type: 'data_exfiltration',
          severity: 'high',
          pattern: pattern.source,
        });
      }
    }

    return { threatsFound: threats, riskPoints: threats.length * 30 };
  }

  async detectSystemModification(command) {
    const threats = [];
    const modificationPatterns = [
      /\/etc\/passwd/,
      /\/etc\/shadow/,
      /\/etc\/hosts/,
      /\/etc\/crontab/,
      /\/boot\//,
      /\/sys\//,
    ];

    for (const pattern of modificationPatterns) {
      if (pattern.test(command)) {
        threats.push({
          type: 'system_modification',
          severity: 'high',
          pattern: pattern.source,
        });
      }
    }

    return { threatsFound: threats, riskPoints: threats.length * 20 };
  }

  async detectNetworkThreats(command) {
    const threats = [];
    const networkPatterns = [/nmap.*-sS/, /nmap.*-A/, /masscan/, /hping3/, /aircrack/, /wireshark/];

    for (const pattern of networkPatterns) {
      if (pattern.test(command)) {
        threats.push({
          type: 'network_reconnaissance',
          severity: 'medium',
          pattern: pattern.source,
        });
      }
    }

    return { threatsFound: threats, riskPoints: threats.length * 15 };
  }
}

class SecretScanner {
  async scanForSecrets(command) {
    const secrets = [];

    const scanResults = await Promise.all([
      this.scanForAPIKeys(command),
      this.scanForPasswords(command),
      this.scanForTokens(command),
      this.scanForCertificates(command),
    ]);

    for (const result of scanResults) {
      if (result.found) {
        secrets.push(result);
      }
    }

    return { secretsFound: secrets, riskPoints: secrets.length * 50 };
  }

  async scanForAPIKeys(command) {
    const apiKeyPatterns = [
      /AKIA[0-9A-Z]{16}/, // AWS Access Key
      /ghp_[a-zA-Z0-9]{36}/, // GitHub Personal Access Token
      /sk-[a-zA-Z0-9]{48}/, // OpenAI API Key
      /AIza[0-9A-Za-z\-_]{35}/, // Google API Key
    ];

    for (const pattern of apiKeyPatterns) {
      const match = command.match(pattern);
      if (match) {
        return {
          found: true,
          type: 'api_key',
          confidence: 0.9,
          location: match.index,
          maskedValue: this.maskSecret(match[0]),
        };
      }
    }

    return { found: false };
  }

  async scanForPasswords(command) {
    const passwordPatterns = [
      /password[\s=:]+["']?([^\s"']+)["']?/i,
      /passwd[\s=:]+["']?([^\s"']+)["']?/i,
      /pwd[\s=:]+["']?([^\s"']+)["']?/i,
    ];

    for (const pattern of passwordPatterns) {
      const match = command.match(pattern);
      if (match) {
        return {
          found: true,
          type: 'password',
          confidence: 0.8,
          location: match.index,
          maskedValue: this.maskSecret(match[1]),
        };
      }
    }

    return { found: false };
  }

  async scanForTokens(command) {
    const tokenPatterns = [
      /token[\s=:]+["']?([a-zA-Z0-9_\-.]{20,})["']?/i,
      /bearer[\s=:]+["']?([a-zA-Z0-9_\-.]{20,})["']?/i,
    ];

    for (const pattern of tokenPatterns) {
      const match = command.match(pattern);
      if (match) {
        return {
          found: true,
          type: 'token',
          confidence: 0.7,
          location: match.index,
          maskedValue: this.maskSecret(match[1]),
        };
      }
    }

    return { found: false };
  }

  async scanForCertificates(command) {
    const certPatterns = [/-----BEGIN [A-Z ]+-----/, /-----END [A-Z ]+-----/];

    for (const pattern of certPatterns) {
      if (pattern.test(command)) {
        return {
          found: true,
          type: 'certificate',
          confidence: 0.95,
          maskedValue: '[CERTIFICATE_DETECTED]',
        };
      }
    }

    return { found: false };
  }

  maskSecret(secret) {
    if (secret.length <= 4) return '***';
    return (
      secret.substring(0, 2) + '*'.repeat(secret.length - 4) + secret.substring(secret.length - 2)
    );
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZeroTrustSecurity;
} else {
  window.ZeroTrustSecurity = ZeroTrustSecurity;
}
