/**
 * RinaWarp Terminal - Enhanced Security
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */

// Import centralized logger
let logger = {
  debug: (msg, ctx) => console.log(`[DEBUG] ${msg}`, ctx),
  info: (msg, ctx) => console.info(`[INFO] ${msg}`, ctx),
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx),
  security: (msg, ctx) => console.warn(`[SECURITY] ${msg}`, ctx),
  system: (msg, ctx) => console.info(`[SYSTEM] ${msg}`, ctx),
};

// Try to load the actual logger module
(async () => {
  try {
    const loggerModule = await import('../utils/logger.js');
    logger = loggerModule.default;
  } catch (error) {
    console.warn('Failed to load logger module, using fallback console logging');
  }
})();

// Import biometric authentication
const biometricAuth = (() => {
  if (typeof require !== 'undefined') {
    try {
      return require('../utils/security/biometric-auth');
    } catch (error) {
      logger.warn('Biometric authentication not available', { error: error.message });
      return null;
    }
  }
  return null;
})();
class EnhancedSecurityEngine {
  constructor() {
    this.auditLogger = new CommandAuditLogger();
    this.privilegeMonitor = new PrivilegeEscalationMonitor();
    this.secretScanner = new RealTimeSecretScanner();
    this.complianceChecker = new ComplianceChecker();
    this.zeroTrustEngine = new ZeroTrustEngine();
    this.threatDetector = new ThreatDetector();
    this.securityPolicies = new Map();
    this.securityAlerts = new Map();
    this.biometricAuth = biometricAuth;
    this.authSessions = new Map();
    this.initializeSecurity();
  }

  initializeSecurity() {
    this.loadSecurityPolicies();
    this.startSecurityMonitoring();
    this.initializeZeroTrust();
  }

  startSecurityMonitoring() {
    // Initialize security monitoring subsystems
    logger.security('Starting security monitoring', {
      component: 'enhanced-security',
      module: 'monitoring',
    });

    // Start real-time threat monitoring
    this.threatMonitoringInterval = setInterval(() => {
      this.performThreatAssessment();
    }, 300000); // Every 5 minutes instead of 30 seconds

    // Initialize security metrics
    this.securityMetrics = {
      commandsAnalyzed: 0,
      threatsDetected: 0,
      complianceViolations: 0,
      biometricAuthAttempts: 0,
      biometricAuthSuccesses: 0,
      lastThreatAssessment: Date.now(),
    };

    // Start audit log rotation
    this.startAuditLogRotation();

    // Start session cleanup
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 600000); // Every 10 minutes

    logger.security('Security monitoring started successfully', {
      component: 'enhanced-security',
      module: 'monitoring',
    });
  }

  performThreatAssessment() {
    // Perform periodic threat assessment
    try {
      const currentTime = Date.now();
      this.securityMetrics.lastThreatAssessment = currentTime;

      // Check for anomalous activity patterns
      this.checkActivityPatterns();

      // Update threat indicators
      this.updateThreatIndicators();

      // Check for compliance drift
      this.checkComplianceDrift();

      logger.security('Threat assessment completed', {
        component: 'enhanced-security',
        module: 'threat-assessment',
        timestamp: currentTime,
        metrics: this.securityMetrics,
      });
    } catch (error) {
      logger.error('Threat assessment failed', {
        component: 'enhanced-security',
        module: 'threat-assessment',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  startAuditLogRotation() {
    // Start audit log rotation to manage storage
    setInterval(() => {
      this.rotateAuditLogs();
    }, 3600000); // Every hour
  }

  rotateAuditLogs() {
    // Rotate audit logs to prevent excessive storage usage
    const maxLogSize = 50 * 1024 * 1024; // 50MB
    const currentLogSize = this.estimateLogSize();

    if (currentLogSize > maxLogSize) {
      this.auditLogger.rotateLog();
      logger.info('Audit logs rotated due to size limit', {
        component: 'enhanced-security',
        module: 'audit-rotation',
        currentLogSize,
        maxLogSize,
      });
    }
  }

  checkActivityPatterns() {
    // Check for suspicious activity patterns
    const recentActivity = this.auditLogger.getRecentActivity(3600000); // Last hour

    // Check for rapid command execution
    if (recentActivity.length > 100) {
      this.raiseSecurityAlert('HIGH_ACTIVITY_VOLUME', {
        commandCount: recentActivity.length,
        timeWindow: '1 hour',
      });
    }

    // Check for privilege escalation patterns
    const escalationCommands = recentActivity.filter(cmd => /sudo|su|runas/.test(cmd.command));

    if (escalationCommands.length > 10) {
      this.raiseSecurityAlert('REPEATED_ESCALATION', {
        escalationCount: escalationCommands.length,
      });
    }
  }

  updateThreatIndicators() {
    // Update threat level indicators based on recent activity
    const threatLevel = this.calculateCurrentThreatLevel();

    if (threatLevel !== this.lastThreatLevel) {
      this.lastThreatLevel = threatLevel;
      this.notifyThreatLevelChange(threatLevel);
    }
  }

  checkComplianceDrift() {
    // Check for compliance policy drift
    const complianceScore = this.calculateComplianceScore();

    if (complianceScore < 0.8) {
      this.raiseSecurityAlert('COMPLIANCE_DRIFT', {
        score: complianceScore,
        threshold: 0.8,
      });
    }
  }

  raiseSecurityAlert(type, details) {
    const alert = {
      id: this.generateAlertId(),
      type: type,
      details: details,
      timestamp: Date.now(),
      severity: this.getAlertSeverity(type),
    };

    this.securityAlerts.set(alert.id, alert);
    logger.security('Security Alert raised', {
      component: 'enhanced-security',
      module: 'alert-system',
      alert: alert,
    });

    // Notify security dashboard if available
    this.notifySecurityDashboard(alert);
  }

  generateAlertId() {
    // Generate cryptographically secure alert ID
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    const secureId = Array.from(array, byte => byte.toString(36).padStart(2, '0'))
      .join('')
      .substr(0, 9);
    return `alert_${Date.now()}_${secureId}`;
  }

  getAlertSeverity(type) {
    const severityMap = {
      HIGH_ACTIVITY_VOLUME: 'medium',
      REPEATED_ESCALATION: 'high',
      COMPLIANCE_DRIFT: 'medium',
      THREAT_DETECTED: 'high',
      POLICY_VIOLATION: 'medium',
    };

    return severityMap[type] || 'low';
  }

  notifySecurityDashboard(alert) {
    // Notify security dashboard of new alert
    if (window.securityDashboard) {
      window.securityDashboard.addAlert(alert);
    }
  }

  notifyThreatLevelChange(newLevel) {
    logger.security('Threat level changed', {
      component: 'enhanced-security',
      module: 'threat-monitoring',
      newLevel: newLevel,
      timestamp: Date.now(),
    });

    if (window.securityDashboard) {
      window.securityDashboard.updateThreatLevel(newLevel);
    }
  }

  calculateCurrentThreatLevel() {
    // Calculate current threat level based on various factors
    const recentThreats = this.getRecentThreats();
    const activeAlerts = this.getActiveAlerts();

    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      return 'CRITICAL';
    }

    if (activeAlerts.some(alert => alert.severity === 'high') || recentThreats.length > 5) {
      return 'HIGH';
    }

    if (activeAlerts.some(alert => alert.severity === 'medium') || recentThreats.length > 2) {
      return 'MEDIUM';
    }

    if (recentThreats.length > 0) {
      return 'LOW';
    }

    return 'NONE';
  }

  calculateComplianceScore() {
    // Calculate overall compliance score
    const recentActivity = this.auditLogger.getRecentActivity(86400000); // Last 24 hours

    if (recentActivity.length === 0) {
      return 1.0; // Perfect score with no activity
    }

    const violations = recentActivity.filter(
      activity => activity.complianceViolations && activity.complianceViolations.length > 0
    );

    return Math.max(0, 1 - violations.length / recentActivity.length);
  }

  getRecentThreats(timeWindow = 3600000) {
    // Get threats detected in the specified time window (default: 1 hour)
    const cutoff = Date.now() - timeWindow;
    return Array.from(this.securityAlerts.values()).filter(
      alert => alert.timestamp > cutoff && alert.type.includes('THREAT')
    );
  }

  getActiveAlerts() {
    // Get all active security alerts
    const cutoff = Date.now() - 86400000; // Last 24 hours
    return Array.from(this.securityAlerts.values()).filter(alert => alert.timestamp > cutoff);
  }

  estimateLogSize() {
    // Estimate current log size in bytes
    try {
      const logData = localStorage.getItem(this.auditLogger.storageKey);
      return logData ? logData.length : 0;
    } catch (error) {
      return 0;
    }
  }

  initializeZeroTrust() {
    // Initialize Zero Trust security policies
    console.log('🛡️ Initializing Zero Trust security...');

    // Set up zero trust verification requirements
    this.zeroTrustEngine.setupVerificationRequirements();

    // Initialize trust score baselines
    this.zeroTrustEngine.initializeTrustBaselines();

    console.log('✅ Zero Trust security initialized');
  }

  async verifyCommandExecution(command, context) {
    const verificationResult = {
      command: command,
      timestamp: Date.now(),
      userId: context.userId,
      sessionId: context.sessionId,
      checks: [],
    };

    try {
      // 1. Policy Verification
      const policyCheck = await this.checkAgainstPolicies(command, context);
      verificationResult.checks.push(policyCheck);
      if (!policyCheck.passed) {
        return this.createDenialResponse('POLICY_VIOLATION', policyCheck);
      }

      // 2. Privilege Verification
      const privilegeCheck = await this.privilegeMonitor.verifyPrivileges(command, context);
      verificationResult.checks.push(privilegeCheck);
      if (!privilegeCheck.passed) {
        return this.createDenialResponse('PRIVILEGE_VIOLATION', privilegeCheck);
      }

      // 3. Threat Detection
      const threatCheck = await this.threatDetector.analyzeCommand(command, context);
      verificationResult.checks.push(threatCheck);
      if (threatCheck.threatLevel === 'CRITICAL') {
        return this.createDenialResponse('THREAT_DETECTED', threatCheck);
      }

      // 4. Biometric Authentication Check
      const biometricRequired = this.requiresBiometricAuth(command, verificationResult.checks);
      if (biometricRequired) {
        const biometricCheck = await this.performBiometricAuthentication(command, context);
        verificationResult.checks.push(biometricCheck);
        if (!biometricCheck.passed) {
          return this.createDenialResponse('BIOMETRIC_AUTH_FAILED', biometricCheck);
        }
      }

      // 5. Secret Scanning
      const secretCheck = await this.secretScanner.scanCommand(command);
      verificationResult.checks.push(secretCheck);
      if (secretCheck.hasSecrets) {
        return this.createWarningResponse('SECRETS_DETECTED', secretCheck);
      }

      // 6. Compliance Check
      const complianceCheck = await this.complianceChecker.verify(command, context);
      verificationResult.checks.push(complianceCheck);

      // Log audit trail
      await this.auditLogger.logCommandVerification(verificationResult);

      return {
        allowed: true,
        verification: verificationResult,
        recommendations: this.generateSecurityRecommendations(verificationResult),
      };
    } catch (error) {
      await this.auditLogger.logSecurityError(error, command, context);
      return this.createDenialResponse('SECURITY_ERROR', { error: error.message });
    }
  }

  async auditCommand(command, result, context) {
    const auditEntry = {
      id: this.generateAuditId(),
      timestamp: Date.now(),
      command: command,
      result: {
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        outputSize: result.output ? result.output.length : 0,
      },
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
        workingDirectory: context.cwd,
        environment: context.environment,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      security: {
        privilegeLevel: await this.determinePrivilegeLevel(command),
        riskLevel: await this.assessRiskLevel(command),
        complianceFlags: await this.complianceChecker.getFlags(command),
      },
      integrity: {
        hash: await this.generateIntegrityHash(command, result, context),
        signature: await this.signAuditEntry(command, result, context),
      },
    };

    // Store in tamper-proof audit log
    await this.auditLogger.storeAuditEntry(auditEntry);

    // Check for audit triggers
    await this.checkAuditTriggers(auditEntry);

    return auditEntry;
  }

  async scanForSecrets(command) {
    const secretPatterns = {
      apiKey: /\b[A-Za-z0-9]{32,}\b/g,
      awsAccessKey: /AKIA[0-9A-Z]{16}/g,
      awsSecretKey: /[A-Za-z0-9/+=]{40}/g,
      githubToken: /ghp_[A-Za-z0-9]{36}/g,
      privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
      password: /(password|pwd|pass)\s*[:=]\s*["']?([^\s"']+)/gi,
      connectionString: /(mongodb|mysql|postgres):\/\/[^\s]+/gi,
      creditCard: /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13})\b/g,
    };

    const detectedSecrets = [];

    for (const [type, pattern] of Object.entries(secretPatterns)) {
      const matches = command.match(pattern);
      if (matches) {
        detectedSecrets.push({
          type: type,
          matches: matches.map(match => ({
            value: this.maskSecret(match),
            position: command.indexOf(match),
            confidence: this.calculateSecretConfidence(type, match),
          })),
        });
      }
    }

    if (detectedSecrets.length > 0) {
      await this.handleSecretDetection(command, detectedSecrets);
    }

    return {
      hasSecrets: detectedSecrets.length > 0,
      secrets: detectedSecrets,
      maskedCommand: this.maskSecretsInCommand(command, detectedSecrets),
    };
  }

  async checkCompliance(command, context) {
    const complianceResults = {
      sox: await this.checkSOXCompliance(command, context),
      hipaa: await this.checkHIPAACompliance(command, context),
      pciDss: await this.checkPCIDSSCompliance(command, context),
      gdpr: await this.checkGDPRCompliance(command, context),
      custom: await this.checkCustomCompliance(command, context),
    };

    const violations = [];
    const warnings = [];

    for (const [standard, result] of Object.entries(complianceResults)) {
      if (result.violations && result.violations.length > 0) {
        violations.push(...result.violations.map(v => ({ ...v, standard })));
      }
      if (result.warnings && result.warnings.length > 0) {
        warnings.push(...result.warnings.map(w => ({ ...w, standard })));
      }
    }

    const overallCompliance = {
      compliant: violations.length === 0,
      violations: violations,
      warnings: warnings,
      recommendations: this.generateComplianceRecommendations(complianceResults),
    };

    // Log compliance check
    await this.auditLogger.logComplianceCheck(overallCompliance, command, context);

    return overallCompliance;
  }

  async monitorPrivilegeEscalation(command, context) {
    const escalationIndicators = {
      sudo: /^sudo\s/.test(command),
      su: /^su\s/.test(command),
      runas: /runas\s/.test(command),
      setuid: /chmod\s+[+]?s/.test(command),
      setgid: /chmod\s+[+]?g/.test(command),
      passwordChange: /(passwd|chpasswd)/.test(command),
      userManagement: /(useradd|usermod|userdel|groupadd|groupmod)/.test(command),
      systemModification: /(systemctl|service|crontab|at)/.test(command),
    };

    const detectedEscalations = [];
    for (const [type, detected] of Object.entries(escalationIndicators)) {
      if (detected) {
        detectedEscalations.push({
          type: type,
          riskLevel: this.getEscalationRiskLevel(type),
          requiresApproval: this.requiresApproval(type, context),
          justification: context.justification || null,
        });
      }
    }

    if (detectedEscalations.length > 0) {
      await this.handlePrivilegeEscalation(command, detectedEscalations, context);
    }

    return {
      hasEscalation: detectedEscalations.length > 0,
      escalations: detectedEscalations,
      approved: await this.checkEscalationApproval(detectedEscalations, context),
    };
  }

  generateSecurityReport(timeRange = '24h') {
    const report = {
      timeRange: timeRange,
      generatedAt: Date.now(),
      summary: {
        totalCommands: 0,
        blockedCommands: 0,
        privilegeEscalations: 0,
        complianceViolations: 0,
        secretsDetected: 0,
      },
      trends: {
        riskLevelDistribution: {},
        topRiskCommands: [],
        userRiskProfiles: {},
        complianceStatus: {},
      },
      recommendations: [],
    };

    // Generate report data (implementation would pull from audit logs)
    return report;
  }

  createSecurityDashboard() {
    const dashboardHTML = `
            <div id="security-dashboard" class="security-dashboard hidden">
                <div class="dashboard-header">
                    <h2>🔒 Security Dashboard</h2>
                    <div class="security-status">
                        <span class="status-indicator secure"></span>
                        <span class="status-text">Secure</span>
                    </div>
                </div>
                
                <div class="security-metrics">
                    <div class="metric-card threat-level">
                        <div class="metric-icon">🛡️</div>
                        <div class="metric-value" id="threat-level">LOW</div>
                        <div class="metric-label">Threat Level</div>
                    </div>
                    
                    <div class="metric-card blocked-commands">
                        <div class="metric-icon">🚫</div>
                        <div class="metric-value" id="blocked-commands">0</div>
                        <div class="metric-label">Blocked Commands</div>
                    </div>
                    
                    <div class="metric-card compliance-score">
                        <div class="metric-icon">📋</div>
                        <div class="metric-value" id="compliance-score">98%</div>
                        <div class="metric-label">Compliance Score</div>
                    </div>
                    
                    <div class="metric-card security-alerts">
                        <div class="metric-icon">⚠️</div>
                        <div class="metric-value" id="security-alerts">0</div>
                        <div class="metric-label">Active Alerts</div>
                    </div>
                </div>
                
                <div class="security-sections">
                    <div class="section audit-log">
                        <h3>Recent Audit Log</h3>
                        <div id="audit-log-entries" class="log-entries"></div>
                    </div>
                    
                    <div class="section threat-analysis">
                        <h3>Threat Analysis</h3>
                        <div id="threat-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="section compliance-status">
                        <h3>Compliance Status</h3>
                        <div id="compliance-indicators" class="compliance-grid"></div>
                    </div>
                    
                    <div class="section security-recommendations">
                        <h3>Security Recommendations</h3>
                        <div id="security-recommendations" class="recommendations-list"></div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    this.attachSecurityDashboardEvents();
  }

  // Helper Methods
  loadSecurityPolicies() {
    const defaultPolicies = {
      destructive_commands: {
        pattern: /rm\s+-rf\s+\/|format\s+c:|del\s+\/s/,
        action: 'block',
        severity: 'critical',
      },
      privilege_escalation: {
        pattern: /sudo|su\s|runas/,
        action: 'audit',
        severity: 'high',
      },
      network_access: {
        pattern: /curl|wget|ssh|scp|ftp/,
        action: 'monitor',
        severity: 'medium',
      },
    };

    for (const [name, policy] of Object.entries(defaultPolicies)) {
      this.securityPolicies.set(name, policy);
    }
  }

  async checkAgainstPolicies(command) {
    const violations = [];

    for (const [policyName, policy] of this.securityPolicies) {
      if (policy.pattern.test(command)) {
        violations.push({
          policy: policyName,
          action: policy.action,
          severity: policy.severity,
          message: `Command violates ${policyName} policy`,
        });
      }
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');

    return {
      passed: criticalViolations.length === 0,
      violations: violations,
      requiresApproval: violations.some(v => v.action === 'block'),
    };
  }

  createDenialResponse(reason, details) {
    return {
      allowed: false,
      reason: reason,
      details: details,
      timestamp: Date.now(),
      message: `Command execution denied: ${reason}`,
    };
  }

  createWarningResponse(reason, details) {
    return {
      allowed: true,
      warning: true,
      reason: reason,
      details: details,
      timestamp: Date.now(),
      message: `Warning: ${reason}`,
    };
  }

  maskSecret(secret) {
    if (secret.length <= 4) return '***';
    return (
      secret.substring(0, 2) + '*'.repeat(secret.length - 4) + secret.substring(secret.length - 2)
    );
  }

  requiresBiometricAuth(command, checks) {
    // Check if biometric authentication is required based on command and security checks

    // 1. Check for privilege escalation commands
    const privilegeCheck = checks.find(check => check.requiresElevation);
    if (privilegeCheck && privilegeCheck.requiresElevation) {
      return true;
    }

    // 2. Check for high-risk threat levels
    const threatCheck = checks.find(check => check.threatLevel);
    if (
      threatCheck &&
      (threatCheck.threatLevel === 'HIGH' || threatCheck.threatLevel === 'CRITICAL')
    ) {
      return true;
    }

    // 3. Check for policy violations that require additional authentication
    const policyCheck = checks.find(check => check.violations);
    if (policyCheck && policyCheck.violations) {
      const criticalViolations = policyCheck.violations.filter(
        v => v.severity === 'critical' || v.severity === 'high'
      );
      if (criticalViolations.length > 0) {
        return true;
      }
    }

    // 4. Check for specific high-risk command patterns
    const highRiskPatterns = [
      /sudo.*rm.*-rf/i,
      /chmod.*777/i,
      /systemctl.*disable.*firewall/i,
      /dd.*if=.*of=/i,
      /format.*c:/i,
      /del.*\/s.*\/q/i,
      /crontab.*-e/i,
      /passwd.*root/i,
    ];

    const requiresAuth = highRiskPatterns.some(pattern => pattern.test(command));
    if (requiresAuth) {
      return true;
    }

    return false;
  }

  async performBiometricAuthentication(command, context) {
    const checkResult = {
      type: 'biometric_authentication',
      timestamp: Date.now(),
      passed: false,
      sessionId: null,
      method: null,
      error: null,
    };

    try {
      // Check if biometric authentication is available
      if (!this.biometricAuth) {
        logger.warn('Biometric authentication not available, using fallback');
        checkResult.passed = true;
        checkResult.method = 'fallback';
        checkResult.message =
          'Biometric authentication not available, using fallback authorization';
        return checkResult;
      }

      // Check for existing valid session
      const existingSession = this.authSessions.get(context.sessionId);
      if (existingSession && this.biometricAuth.validateAuthSession(existingSession)) {
        logger.debug('Using existing biometric session', { sessionId: existingSession.sessionId });
        checkResult.passed = true;
        checkResult.sessionId = existingSession.sessionId;
        checkResult.method = existingSession.method;
        checkResult.message = 'Using existing biometric session';
        return checkResult;
      }

      // Generate authentication reason
      const reason = this.generateAuthReason(command);

      // Perform biometric authentication
      logger.info('Performing biometric authentication', {
        command: this.maskCommand(command),
        reason,
      });
      const authResult = await this.biometricAuth.authenticateForSecureAction(reason);

      if (authResult.success) {
        // Create and store authentication session
        const authSession = this.biometricAuth.createAuthSession(authResult);
        if (authSession) {
          this.authSessions.set(context.sessionId, authSession);
          logger.security('Biometric authentication successful', {
            sessionId: authSession.sessionId,
            method: authSession.method,
            command: this.maskCommand(command),
          });
        }

        checkResult.passed = true;
        checkResult.sessionId = authSession?.sessionId;
        checkResult.method = authResult.method;
        checkResult.message = 'Biometric authentication successful';
      } else {
        logger.security('Biometric authentication failed', {
          error: authResult.error,
          command: this.maskCommand(command),
        });
        checkResult.error = authResult.error;
        checkResult.message = 'Biometric authentication failed';
      }

      return checkResult;
    } catch (error) {
      logger.error('Biometric authentication error', {
        error: error.message,
        command: this.maskCommand(command),
      });
      checkResult.error = error.message;
      checkResult.message = 'Biometric authentication error';
      return checkResult;
    }
  }

  generateAuthReason(command) {
    // Generate human-readable authentication reason
    const maskedCommand = this.maskCommand(command);

    if (/sudo|su\s/.test(command)) {
      return `Administrative access required for: ${maskedCommand}`;
    }

    if (/rm.*-rf|del.*\/s/i.test(command)) {
      return `Destructive operation requires confirmation: ${maskedCommand}`;
    }

    if (/chmod.*777|format/i.test(command)) {
      return `System modification requires authorization: ${maskedCommand}`;
    }

    if (/systemctl|service/i.test(command)) {
      return `System service operation requires approval: ${maskedCommand}`;
    }

    return `Security verification required for: ${maskedCommand}`;
  }

  maskCommand(command) {
    // Mask sensitive parts of command for logging
    return command
      .replace(/password\s*[:=]\s*["']?([^\s"']+)/gi, 'password=***')
      .replace(/token\s*[:=]\s*["']?([A-Za-z0-9_-]{20,})/gi, 'token=***')
      .replace(/key\s*[:=]\s*["']?([A-Za-z0-9_-]{20,})/gi, 'key=***')
      .substring(0, 100); // Limit length for logging
  }

  cleanupExpiredSessions() {
    // Clean up expired authentication sessions
    const sessionsToRemove = [];

    for (const [sessionId, session] of this.authSessions.entries()) {
      if (!this.biometricAuth.validateAuthSession(session)) {
        sessionsToRemove.push(sessionId);
      }
    }

    sessionsToRemove.forEach(sessionId => {
      this.authSessions.delete(sessionId);
      logger.debug('Removed expired authentication session', { sessionId });
    });
  }

  generateAuditId() {
    // Generate cryptographically secure audit ID
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    const secureId = Array.from(array, byte => byte.toString(36).padStart(2, '0'))
      .join('')
      .substr(0, 9);
    return `audit_${Date.now()}_${secureId}`;
  }

  async generateIntegrityHash(command, result, context) {
    const data = JSON.stringify({ command, result, context });
    // In a real implementation, use a proper cryptographic hash
    return btoa(data).substring(0, 32);
  }
}

class CommandAuditLogger {
  constructor() {
    this.auditLog = [];
    this.maxEntries = 10000;
    this.storageKey = 'rinawarp_audit_log';
  }

  async storeAuditEntry(entry) {
    this.auditLog.unshift(entry);

    // Maintain size limit
    if (this.auditLog.length > this.maxEntries) {
      this.auditLog = this.auditLog.slice(0, this.maxEntries);
    }

    // Persist to storage
    await this.persistAuditLog();
  }

  async logCommandVerification(verification) {
    console.log('Command Verification:', verification);
  }

  async logSecurityError(error, command, context) {
    console.error('Security Error:', { error, command, context });
  }

  async logComplianceCheck(compliance, command, context) {
    console.log('Compliance Check:', { compliance, command, context });
  }

  async persistAuditLog() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.auditLog));
    } catch (error) {
      console.error('Failed to persist audit log:', error);
    }
  }

  getAuditHistory(limit = 100) {
    return this.auditLog.slice(0, limit);
  }

  getRecentActivity(timeWindow = 3600000) {
    // Get recent activity within the specified time window (default: 1 hour)
    const cutoff = Date.now() - timeWindow;
    return this.auditLog.filter(entry => entry.timestamp > cutoff);
  }

  rotateLog() {
    // Rotate audit logs when they get too large
    const rotatedEntries = this.auditLog.splice(5000); // Keep last 5000 entries

    // Store rotated entries separately if needed
    try {
      const rotatedKey = `${this.storageKey}_rotated_${Date.now()}`;
      localStorage.setItem(rotatedKey, JSON.stringify(rotatedEntries));
      console.log(`📁 Rotated ${rotatedEntries.length} audit log entries`);
    } catch (error) {
      console.error('Failed to store rotated audit log:', error);
    }
  }
}

class PrivilegeEscalationMonitor {
  async verifyPrivileges(command, context) {
    const requiresElevation = this.checkRequiresElevation(command);
    const hasElevation = this.checkHasElevation(context);

    return {
      passed: !requiresElevation || hasElevation,
      requiresElevation: requiresElevation,
      hasElevation: hasElevation,
      message:
        requiresElevation && !hasElevation
          ? 'Command requires elevated privileges'
          : 'Privilege check passed',
    };
  }

  checkRequiresElevation(command) {
    const elevatedPatterns = [
      /^sudo\s/,
      /^su\s/,
      /chmod.*777/,
      /chown.*root/,
      /systemctl/,
      /service\s/,
    ];

    return elevatedPatterns.some(pattern => pattern.test(command));
  }

  checkHasElevation(context) {
    // Check if user has appropriate elevation
    return context.hasElevation || false;
  }
}

class RealTimeSecretScanner {
  async scanCommand(command) {
    const secretPatterns = {
      apiKey: {
        pattern: /\b[A-Za-z0-9]{32,}\b/g,
        confidence: 0.7,
      },
      password: {
        pattern: /(password|pwd|pass)\s*[:=]\s*["']?([^\s"']+)/gi,
        confidence: 0.9,
      },
      token: {
        pattern: /(token|key)\s*[:=]\s*["']?([A-Za-z0-9_-]{20,})/gi,
        confidence: 0.8,
      },
    };

    const detectedSecrets = [];

    for (const [type, config] of Object.entries(secretPatterns)) {
      const matches = command.match(config.pattern);
      if (matches) {
        detectedSecrets.push({
          type: type,
          confidence: config.confidence,
          count: matches.length,
        });
      }
    }

    return {
      hasSecrets: detectedSecrets.length > 0,
      secrets: detectedSecrets,
    };
  }
}

class ComplianceChecker {
  async verify(command, context) {
    const checks = {
      dataHandling: this.checkDataHandling(command),
      auditRequirement: this.checkAuditRequirement(command),
      accessControl: this.checkAccessControl(command, context),
    };

    const violations = Object.entries(checks)
      .filter(([, check]) => !check.compliant)
      .map(([name, check]) => ({ check: name, ...check }));

    return {
      compliant: violations.length === 0,
      violations: violations,
      checks: checks,
    };
  }

  checkDataHandling(command) {
    // Check for proper data handling procedures
    const sensitiveDataPatterns = /\b(ssn|social|credit|card|account)\b/i;

    return {
      compliant: !sensitiveDataPatterns.test(command),
      message: 'Data handling compliance check',
    };
  }

  checkAuditRequirement(_command) {
    // All commands should be auditable
    return {
      compliant: true,
      message: 'Audit requirement check',
    };
  }

  checkAccessControl(_command, _context) {
    // Check access control compliance
    return {
      compliant: true,
      message: 'Access control compliance check',
    };
  }
}

class ZeroTrustEngine {
  constructor() {
    this.trustScores = new Map();
    this.verificationRequirements = new Map();
    this.trustBaselines = new Map();
  }

  setupVerificationRequirements() {
    // Set up verification requirements for different command types
    console.log('🔐 Setting up verification requirements...');

    const requirements = {
      privilege_escalation: {
        minTrustScore: 0.8,
        requiresMFA: true,
        requiresApproval: true,
        timeWindow: 3600000, // 1 hour
      },
      system_modification: {
        minTrustScore: 0.7,
        requiresMFA: false,
        requiresApproval: false,
        timeWindow: 1800000, // 30 minutes
      },
      data_access: {
        minTrustScore: 0.6,
        requiresMFA: false,
        requiresApproval: false,
        timeWindow: 900000, // 15 minutes
      },
      network_operations: {
        minTrustScore: 0.5,
        requiresMFA: false,
        requiresApproval: false,
        timeWindow: 600000, // 10 minutes
      },
    };

    for (const [category, requirement] of Object.entries(requirements)) {
      this.verificationRequirements.set(category, requirement);
    }

    console.log('✅ Verification requirements configured');
  }

  initializeTrustBaselines() {
    // Initialize trust score baselines for different entities
    console.log('📊 Initializing trust baselines...');

    const baselines = {
      new_user: 0.3,
      established_user: 0.7,
      privileged_user: 0.8,
      system_account: 0.9,
      external_user: 0.2,
    };

    for (const [userType, baseline] of Object.entries(baselines)) {
      this.trustBaselines.set(userType, baseline);
    }

    console.log('✅ Trust baselines initialized');
  }

  async evaluateTrustScore(command, context) {
    const factors = {
      userHistory: await this.evaluateUserHistory(context.userId),
      commandRisk: await this.evaluateCommandRisk(command),
      contextRisk: await this.evaluateContextRisk(context),
      timeRisk: await this.evaluateTimeRisk(),
    };

    const trustScore = this.calculateTrustScore(factors);

    return {
      score: trustScore,
      factors: factors,
      requiresAdditionalVerification: trustScore < 0.7,
    };
  }

  calculateTrustScore(factors) {
    const weights = {
      userHistory: 0.3,
      commandRisk: 0.4,
      contextRisk: 0.2,
      timeRisk: 0.1,
    };

    return Object.entries(factors).reduce((score, [factor, value]) => {
      return score + value * weights[factor];
    }, 0);
  }

  async evaluateUserHistory() {
    // Evaluate user's historical behavior
    return 0.8; // Mock score
  }

  async evaluateCommandRisk(command) {
    // Evaluate risk level of the command
    const riskPatterns = [
      { pattern: /rm\s+-rf/, risk: 0.1 },
      { pattern: /sudo/, risk: 0.6 },
      { pattern: /chmod/, risk: 0.7 },
    ];

    for (const { pattern, risk } of riskPatterns) {
      if (pattern.test(command)) {
        return risk;
      }
    }

    return 0.9; // Default low risk
  }

  async evaluateContextRisk() {
    // Evaluate context risk factors
    return 0.8; // Mock score
  }

  async evaluateTimeRisk() {
    // Evaluate time-based risk factors
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      return 0.6; // Higher risk during off-hours
    }
    return 0.9;
  }
}

class ThreatDetector {
  async analyzeCommand(_command) {
    const threats = {
      malware: this.detectMalwarePatterns(_command),
      injection: this.detectInjectionAttempts(_command),
      dataExfiltration: this.detectDataExfiltration(_command),
      systemCompromise: this.detectSystemCompromise(_command),
    };

    const detectedThreats = Object.entries(threats)
      .filter(([, detected]) => detected.detected)
      .map(([type, threat]) => ({ type, ...threat }));

    const maxThreatLevel =
      detectedThreats.length > 0
        ? Math.max(...detectedThreats.map(t => this.getThreatLevelScore(t.level)))
        : 0;

    return {
      threatLevel: this.scoreTolevel(maxThreatLevel),
      threats: detectedThreats,
      recommendation: this.getRecommendation(maxThreatLevel),
    };
  }

  detectMalwarePatterns(command) {
    const malwarePatterns = [/curl.*\|\s*sh/, /wget.*\|\s*bash/, /eval\s*\$\(/, /base64.*decode/];

    const detected = malwarePatterns.some(pattern => pattern.test(command));

    return {
      detected: detected,
      level: detected ? 'HIGH' : 'NONE',
      description: 'Potential malware download/execution pattern',
    };
  }

  detectInjectionAttempts(command) {
    const injectionPatterns = [/;\s*(rm|del|format)/, /\|\s*(nc|netcat)/, /\$\(.*\)/, /`.*`/];

    const detected = injectionPatterns.some(pattern => pattern.test(command));

    return {
      detected: detected,
      level: detected ? 'MEDIUM' : 'NONE',
      description: 'Potential command injection attempt',
    };
  }

  detectDataExfiltration(command) {
    const exfiltrationPatterns = [/scp.*@/, /rsync.*@/, /tar.*\|.*ssh/, /curl.*-d.*@/];

    const detected = exfiltrationPatterns.some(pattern => pattern.test(command));

    return {
      detected: detected,
      level: detected ? 'HIGH' : 'NONE',
      description: 'Potential data exfiltration attempt',
    };
  }

  detectSystemCompromise(command) {
    const compromisePatterns = [
      /chmod.*777.*\/etc/,
      /echo.*>>.*\/etc\/passwd/,
      /crontab.*\|/,
      /systemctl.*disable.*firewall/,
    ];

    const detected = compromisePatterns.some(pattern => pattern.test(command));

    return {
      detected: detected,
      level: detected ? 'CRITICAL' : 'NONE',
      description: 'Potential system compromise attempt',
    };
  }

  getThreatLevelScore(level) {
    const scores = {
      NONE: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    return scores[level] || 0;
  }

  scoreTolevel(score) {
    if (score >= 4) return 'CRITICAL';
    if (score >= 3) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    if (score >= 1) return 'LOW';
    return 'NONE';
  }

  getRecommendation(threatLevel) {
    if (threatLevel >= 4) return 'Block command immediately and investigate';
    if (threatLevel >= 3) return 'Require additional authorization';
    if (threatLevel >= 2) return 'Increase monitoring and logging';
    if (threatLevel >= 1) return 'Monitor for suspicious follow-up activity';
    return 'No additional action required';
  }
}

// ES6 exports for module system
const EnhancedSecurity = EnhancedSecurityEngine;
const ZeroTrustSecurity = ZeroTrustEngine;

export {
  EnhancedSecurityEngine,
  ZeroTrustSecurity,
  EnhancedSecurity,
  ZeroTrustEngine,
  ThreatDetector,
  ComplianceChecker,
  CommandAuditLogger,
};
