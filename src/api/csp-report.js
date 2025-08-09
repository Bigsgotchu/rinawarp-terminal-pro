/**
 * Content Security Policy Violation Report Handler
 * Handles CSP violations and logs them for security monitoring
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for CSP reports (prevent spam)
const cspReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 reports per IP per 15 minutes
  message: { error: 'Too many CSP reports' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/csp-report
 * Handle Content Security Policy violation reports
 */
router.post('/', cspReportLimiter, express.json({ limit: '1mb' }), (req, res) => {
  try {
    const report = req.body;

    // Log CSP violation (in production, send to monitoring service)
    console.log('🛡️ CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      violation: {
        blockedUri: report['csp-report']?.['blocked-uri'],
        documentUri: report['csp-report']?.['document-uri'],
        violatedDirective: report['csp-report']?.['violated-directive'],
        effectiveDirective: report['csp-report']?.['effective-directive'],
        originalPolicy: report['csp-report']?.['original-policy'],
        sourceFile: report['csp-report']?.['source-file'],
        lineNumber: report['csp-report']?.['line-number'],
        columnNumber: report['csp-report']?.['column-number'],
        statusCode: report['csp-report']?.['status-code'],
      },
    });

    // In production, you might want to:
    // - Send to monitoring service (Sentry, LogRocket, etc.)
    // - Store in database for analysis
    // - Alert on critical violations

    res.status(204).end(); // No content response
  } catch (error) {
    console.error('❌ Error processing CSP report:', error);
    res.status(400).json({ error: 'Invalid CSP report format' });
  }
});

/**
 * GET /api/csp-report/status
 * Check CSP report endpoint status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    endpoint: '/api/csp-report',
    purpose: 'Content Security Policy violation reporting',
    timestamp: new Date().toISOString(),
  });
});

export default router;
