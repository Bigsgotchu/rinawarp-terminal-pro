import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(path.dirname(__dirname), '..', 'logs');

// Custom formats for structured logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(info => {
    // Ensure consistent structure for audit logs
    const logEntry = {
      timestamp: info.timestamp,
      level: info.level,
      service: 'rinawarp-terminal',
      component: info.component || 'general',
      eventType: info.eventType,
      eventId: info.eventId,
      correlationId: info.correlationId,
      sessionId: info.sessionId,
      customerId: info.customerId,
      licenseKey: info.licenseKey,
      stripeObjectId: info.stripeObjectId,
      priceId: info.priceId,
      subscriptionId: info.subscriptionId,
      invoiceId: info.invoiceId,
      status: info.status,
      errorCode: info.errorCode,
      message: info.message,
      metadata: info.metadata,
      requestInfo: info.requestInfo,
      responseInfo: info.responseInfo,
      performance: info.performance,
      stack: info.stack,
    };

    // Remove undefined/null values to keep logs clean
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined || logEntry[key] === null) {
        delete logEntry[key];
      }
    });

    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(info => {
    const prefix = info.component ? `[${info.component.toUpperCase()}]` : '[SYSTEM]';
    const eventInfo = info.eventType ? ` ${info.eventType}` : '';
    const correlationInfo = info.correlationId ? ` (${info.correlationId})` : '';
    return `${info.timestamp} ${prefix}${eventInfo}${correlationInfo} ${info.message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'rinawarp-terminal',
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    }),

    // File transport for all logs with rotation
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      format: jsonFormat,
      level: 'info',
    }),

    // Separate file for error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '90d',
      format: jsonFormat,
      level: 'error',
    }),

    // Audit trail for webhooks and payments
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-webhook-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '500m',
      maxFiles: '365d', // Keep audit logs for 1 year
      format: jsonFormat,
      level: 'info',
    }),

    // Payment audit trail
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-payment-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '500m',
      maxFiles: '365d', // Keep payment logs for 1 year
      format: jsonFormat,
      level: 'info',
    }),
  ],

  // Handle unhandled exceptions
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      format: jsonFormat,
    }),
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      format: jsonFormat,
    }),
  ],
});

// Generate correlation ID for request tracking
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Webhook audit logger
export const webhookAudit = {
  received: (eventData, requestInfo) => {
    logger.info({
      component: 'webhook',
      eventType: 'webhook.received',
      eventId: eventData.id,
      correlationId: generateCorrelationId(),
      stripeObjectId: eventData.data?.object?.id,
      status: 'received',
      message: `Webhook received: ${eventData.type}`,
      metadata: {
        webhookType: eventData.type,
        livemode: eventData.livemode,
        api_version: eventData.api_version,
        created: eventData.created,
      },
      requestInfo: {
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        headers: requestInfo.headers,
        bodySize: requestInfo.bodySize,
        timestamp: requestInfo.timestamp,
      },
    });
  },

  verified: (eventData, correlationId) => {
    logger.info({
      component: 'webhook',
      eventType: 'webhook.signature_verified',
      eventId: eventData.id,
      correlationId,
      stripeObjectId: eventData.data?.object?.id,
      status: 'verified',
      message: 'Webhook signature verified successfully',
      metadata: {
        webhookType: eventData.type,
        livemode: eventData.livemode,
      },
    });
  },

  failed: (eventData, error, requestInfo, correlationId) => {
    logger.error({
      component: 'webhook',
      eventType: 'webhook.verification_failed',
      eventId: eventData?.id,
      correlationId,
      status: 'failed',
      errorCode: error.code || 'VERIFICATION_ERROR',
      message: `Webhook verification failed: ${error.message}`,
      stack: error.stack,
      metadata: {
        webhookType: eventData?.type,
        errorType: error.type,
      },
      requestInfo,
    });
  },

  processed: (eventData, correlationId, processingTime) => {
    logger.info({
      component: 'webhook',
      eventType: 'webhook.processed',
      eventId: eventData.id,
      correlationId,
      stripeObjectId: eventData.data?.object?.id,
      status: 'processed',
      message: 'Webhook processed successfully',
      metadata: {
        webhookType: eventData.type,
        livemode: eventData.livemode,
      },
      performance: {
        processingTime: `${processingTime}ms`,
      },
    });
  },
};

// Payment audit logger
export const paymentAudit = {
  success: (sessionData, licenseData, correlationId) => {
    logger.info({
      component: 'payment',
      eventType: 'payment.success',
      eventId: sessionData.id,
      correlationId,
      sessionId: sessionData.id,
      customerId: sessionData.customer,
      licenseKey: licenseData?.licenseKey,
      stripeObjectId: sessionData.id,
      priceId: licenseData?.priceId,
      status: 'success',
      message: 'Payment completed successfully',
      metadata: {
        paymentStatus: sessionData.payment_status,
        amount: sessionData.amount_total,
        currency: sessionData.currency,
        licenseType: licenseData?.licenseType,
        customerEmail: licenseData?.customerEmail,
      },
    });
  },

  licenseGenerated: (licenseData, correlationId) => {
    logger.info({
      component: 'license',
      eventType: 'license.generated',
      correlationId,
      customerId: licenseData.customerId,
      licenseKey: licenseData.licenseKey,
      sessionId: licenseData.sessionId,
      status: 'generated',
      message: 'License key generated successfully',
      metadata: {
        licenseType: licenseData.licenseType,
        customerEmail: licenseData.customerEmail,
        priceId: licenseData.priceId,
      },
    });
  },

  emailSent: (emailData, correlationId) => {
    logger.info({
      component: 'email',
      eventType: 'license.email_sent',
      correlationId,
      customerId: emailData.customerId,
      licenseKey: emailData.licenseKey,
      status: 'sent',
      message: 'License email sent successfully',
      metadata: {
        to: emailData.email,
        licenseType: emailData.licenseType,
        messageId: emailData.messageId,
      },
    });
  },

  emailFailed: (emailData, error, correlationId) => {
    logger.error({
      component: 'email',
      eventType: 'license.email_failed',
      correlationId,
      customerId: emailData.customerId,
      licenseKey: emailData.licenseKey,
      status: 'failed',
      errorCode: error.code || 'EMAIL_ERROR',
      message: `License email delivery failed: ${error.message}`,
      stack: error.stack,
      metadata: {
        to: emailData.email,
        licenseType: emailData.licenseType,
        smtpResponse: error.response,
      },
    });
  },

  failed: (sessionData, error, correlationId) => {
    logger.error({
      component: 'payment',
      eventType: 'payment.failed',
      eventId: sessionData?.id,
      correlationId,
      sessionId: sessionData?.id,
      customerId: sessionData?.customer,
      stripeObjectId: sessionData?.id,
      status: 'failed',
      errorCode: error.code || 'PAYMENT_ERROR',
      message: `Payment processing failed: ${error.message}`,
      stack: error.stack,
      metadata: {
        errorType: error.type,
        paymentStatus: sessionData?.payment_status,
      },
    });
  },
};

// Subscription audit logger
export const subscriptionAudit = {
  created: (subscriptionData, correlationId) => {
    logger.info({
      component: 'subscription',
      eventType: 'subscription.created',
      correlationId,
      subscriptionId: subscriptionData.id,
      customerId: subscriptionData.customer,
      stripeObjectId: subscriptionData.id,
      priceId: subscriptionData.items?.data[0]?.price?.id,
      status: 'created',
      message: 'Subscription created successfully',
      metadata: {
        subscriptionStatus: subscriptionData.status,
        currentPeriodStart: subscriptionData.current_period_start,
        currentPeriodEnd: subscriptionData.current_period_end,
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      },
    });
  },

  updated: (subscriptionData, correlationId) => {
    logger.info({
      component: 'subscription',
      eventType: 'subscription.updated',
      correlationId,
      subscriptionId: subscriptionData.id,
      customerId: subscriptionData.customer,
      stripeObjectId: subscriptionData.id,
      status: subscriptionData.status,
      message: 'Subscription updated',
      metadata: {
        subscriptionStatus: subscriptionData.status,
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
        currentPeriodEnd: subscriptionData.current_period_end,
      },
    });
  },

  cancelled: (subscriptionData, correlationId) => {
    logger.warn({
      component: 'subscription',
      eventType: 'subscription.cancelled',
      correlationId,
      subscriptionId: subscriptionData.id,
      customerId: subscriptionData.customer,
      stripeObjectId: subscriptionData.id,
      status: 'cancelled',
      message: 'Subscription cancelled',
      metadata: {
        cancelledAt: subscriptionData.canceled_at,
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
        endedAt: subscriptionData.ended_at,
      },
    });
  },
};

// Invoice audit logger
export const invoiceAudit = {
  paymentSucceeded: (invoiceData, correlationId) => {
    logger.info({
      component: 'invoice',
      eventType: 'invoice.payment_succeeded',
      correlationId,
      invoiceId: invoiceData.id,
      customerId: invoiceData.customer,
      subscriptionId: invoiceData.subscription,
      stripeObjectId: invoiceData.id,
      status: 'paid',
      message: 'Invoice payment succeeded',
      metadata: {
        amount: invoiceData.amount_paid,
        currency: invoiceData.currency,
        billingReason: invoiceData.billing_reason,
        periodStart: invoiceData.period_start,
        periodEnd: invoiceData.period_end,
      },
    });
  },

  paymentFailed: (invoiceData, correlationId) => {
    logger.error({
      component: 'invoice',
      eventType: 'invoice.payment_failed',
      correlationId,
      invoiceId: invoiceData.id,
      customerId: invoiceData.customer,
      subscriptionId: invoiceData.subscription,
      stripeObjectId: invoiceData.id,
      status: 'payment_failed',
      message: 'Invoice payment failed',
      metadata: {
        amount: invoiceData.amount_due,
        currency: invoiceData.currency,
        billingReason: invoiceData.billing_reason,
        attemptCount: invoiceData.attempt_count,
      },
    });
  },
};

// General audit logger for other events
export const audit = {
  info: (component, eventType, data) => {
    logger.info({
      component,
      eventType,
      correlationId: generateCorrelationId(),
      ...data,
    });
  },

  warn: (component, eventType, data) => {
    logger.warn({
      component,
      eventType,
      correlationId: generateCorrelationId(),
      ...data,
    });
  },

  error: (component, eventType, error, data = {}) => {
    logger.error({
      component,
      eventType,
      correlationId: generateCorrelationId(),
      errorCode: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      ...data,
    });
  },
};

export default logger;
