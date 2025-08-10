/**
 * Practical Examples: Using Sentry Helpers in Express Routes
 *
 * This file demonstrates how to integrate Sentry monitoring helpers
 * into various types of Express routes for better observability,
 * error tracking, and performance monitoring in production.
 *
 * Examples include:
 * - Simple API endpoints
 * - Database operations
 * - External API calls
 * - File operations
 * - Authentication flows
 * - Payment processing
 * - Email sending
 * - Middleware functions
 */

import express from 'express';

// Example Express app setup
const app = express();
app.use(express.json());

/**
 * Example 1: Simple API Endpoint with Basic Monitoring
 * Use case: Basic GET endpoint with performance tracking and error handling
 */
app.get('/api/user/:id', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('user_fetch', async () => {
    try {
      const { id } = req.params;

      // Add breadcrumb for debugging
      addBreadcrumb('Fetching user data', 'http', 'info', {
        userId: id,
        endpoint: '/api/user/:id',
      });

      // Simulate user lookup (replace with actual database call)
      const user = await getUserById(id);

      if (!user) {
        addBreadcrumb('User not found', 'http', 'warning', { userId: id });
        return res.status(404).json({ error: 'User not found' });
      }

      addBreadcrumb('User data retrieved successfully', 'http', 'info', {
        userId: id,
        userEmail: user.email,
      });

      res.json({ user });
    } catch (error) {
      captureErrorWithContext(error, 'user_management', {
        userId: req.params.id,
        endpoint: '/api/user/:id',
        userAgent: req.get('user-agent'),
      });

      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });
});

/**
 * Example 2: Database Operation with Transaction Monitoring
 * Use case: POST endpoint that creates records with database monitoring
 */
app.post('/api/projects', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('project_creation', async () => {
    try {
      const { name, description, userId } = req.body;

      addBreadcrumb('Starting project creation', 'database', 'info', {
        projectName: name,
        userId: userId,
      });

      // Validate input
      if (!name || !userId) {
        addBreadcrumb('Invalid project data', 'validation', 'error', {
          missingName: !name,
          missingUserId: !userId,
        });
        return res.status(400).json({ error: 'Name and user ID are required' });
      }

      // Track database operation separately
      const project = await trackPerformance('database_insert_project', async () => {
        addBreadcrumb('Inserting project into database', 'database', 'info');
        return await createProject({ name, description, userId });
      });

      addBreadcrumb('Project created successfully', 'database', 'info', {
        projectId: project.id,
        projectName: project.name,
      });

      // Track notification sending
      await trackPerformance('project_notification', async () => {
        addBreadcrumb('Sending project creation notification', 'email', 'info');
        await sendProjectCreatedEmail(userId, project);
      });

      res.status(201).json({ project });
    } catch (error) {
      captureErrorWithContext(error, 'project_management', {
        requestBody: req.body,
        userId: req.body?.userId,
        endpoint: '/api/projects',
      });

      res.status(500).json({ error: 'Failed to create project' });
    }
  });
});

/**
 * Example 3: External API Integration with Retry Logic
 * Use case: Endpoint that calls external services with proper error tracking
 */
app.get('/api/integrations/github/:username', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('github_integration', async () => {
    try {
      const { username } = req.params;

      addBreadcrumb('Starting GitHub API integration', 'integration', 'info', {
        username: username,
        endpoint: 'github_user_repos',
      });

      let repositories;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          repositories = await trackPerformance('github_api_call', async () => {
            addBreadcrumb(`GitHub API call attempt ${retryCount + 1}`, 'http', 'info', {
              username: username,
              attempt: retryCount + 1,
            });

            const response = await fetch(`https://api.github.com/users/${username}/repos`);

            if (!response.ok) {
              throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
          });

          break; // Success, exit retry loop
        } catch (apiError) {
          retryCount++;

          addBreadcrumb(`GitHub API attempt ${retryCount} failed`, 'http', 'error', {
            username: username,
            attempt: retryCount,
            error: apiError.message,
          });

          if (retryCount >= maxRetries) {
            throw apiError; // Final attempt failed
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      addBreadcrumb('GitHub repositories retrieved successfully', 'integration', 'info', {
        username: username,
        repositoryCount: repositories.length,
        attempts: retryCount + 1,
      });

      res.json({
        repositories: repositories.slice(0, 10), // Limit to 10 repos
        totalFound: repositories.length,
      });
    } catch (error) {
      captureErrorWithContext(error, 'external_integration', {
        service: 'github',
        username: req.params.username,
        endpoint: '/api/integrations/github/:username',
        errorType: error.name,
      });

      res.status(500).json({ error: 'Failed to fetch GitHub repositories' });
    }
  });
});

/**
 * Example 4: File Upload with Progress Monitoring
 * Use case: File upload endpoint with detailed progress tracking
 */
app.post('/api/files/upload', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('file_upload', async () => {
    try {
      addBreadcrumb('File upload initiated', 'file', 'info', {
        contentType: req.get('content-type'),
        contentLength: req.get('content-length'),
      });

      // Simulate file validation
      const fileValidation = await trackPerformance('file_validation', async () => {
        addBreadcrumb('Validating file upload', 'file', 'info');

        const maxSize = 10 * 1024 * 1024; // 10MB
        const contentLength = parseInt(req.get('content-length') || '0');

        if (contentLength > maxSize) {
          throw new Error(`File size exceeds limit: ${contentLength} bytes`);
        }

        return { valid: true, size: contentLength };
      });

      // Simulate file processing
      const processedFile = await trackPerformance('file_processing', async () => {
        addBreadcrumb('Processing uploaded file', 'file', 'info', {
          fileSize: fileValidation.size,
        });

        // Simulate processing time based on file size
        const processingTime = Math.min(fileValidation.size / 100000, 2000);
        await new Promise(resolve => setTimeout(resolve, processingTime));

        return {
          id: `file_${Date.now()}`,
          originalSize: fileValidation.size,
          processedAt: new Date().toISOString(),
        };
      });

      addBreadcrumb('File upload completed successfully', 'file', 'info', {
        fileId: processedFile.id,
        processingDuration: `${Date.now() - req.startTime}ms`,
      });

      res.json({ file: processedFile });
    } catch (error) {
      captureErrorWithContext(error, 'file_management', {
        endpoint: '/api/files/upload',
        contentType: req.get('content-type'),
        contentLength: req.get('content-length'),
        errorStage: error.message.includes('validation')
          ? 'validation'
          : error.message.includes('processing')
            ? 'processing'
            : 'unknown',
      });

      res.status(500).json({ error: 'File upload failed' });
    }
  });
});

/**
 * Example 5: Authentication Flow with Security Monitoring
 * Use case: Login endpoint with security-focused monitoring
 */
app.post('/api/auth/login', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('user_authentication', async () => {
    try {
      const { email, password } = req.body;

      addBreadcrumb('Authentication attempt started', 'auth', 'info', {
        email: email?.substring(0, 5) + '***', // Partial email for privacy
        userAgent: req.get('user-agent'),
        clientIP: req.ip,
      });

      // Input validation
      if (!email || !password) {
        addBreadcrumb('Authentication failed - missing credentials', 'auth', 'warning', {
          missingEmail: !email,
          missingPassword: !password,
        });
        return res.status(400).json({ error: 'Email and password required' });
      }

      // User lookup and password verification
      const authResult = await trackPerformance('credential_verification', async () => {
        addBreadcrumb('Verifying user credentials', 'auth', 'info');

        const user = await findUserByEmail(email);
        if (!user) {
          throw new Error('User not found');
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        return user;
      });

      // Token generation
      const token = await trackPerformance('token_generation', async () => {
        addBreadcrumb('Generating authentication token', 'auth', 'info', {
          userId: authResult.id,
        });
        return generateJWTToken(authResult);
      });

      addBreadcrumb('Authentication successful', 'auth', 'info', {
        userId: authResult.id,
        userRole: authResult.role,
      });

      res.json({
        token,
        user: {
          id: authResult.id,
          email: authResult.email,
          role: authResult.role,
        },
      });
    } catch (error) {
      // Determine if this is a security-related error
      const isSecurityError =
        error.message.includes('not found') || error.message.includes('Invalid password');

      captureErrorWithContext(error, 'authentication', {
        email: req.body?.email?.substring(0, 5) + '***',
        endpoint: '/api/auth/login',
        clientIP: req.ip,
        userAgent: req.get('user-agent'),
        isSecurityThreat: isSecurityError,
        attemptedEmail: req.body?.email,
      });

      // Don't reveal specific error details for security
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

/**
 * Example 6: Payment Processing with Transaction Monitoring
 * Use case: Payment endpoint with comprehensive financial transaction tracking
 */
app.post('/api/payments/process', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('payment_processing', async () => {
    try {
      const { amount, currency, paymentMethodId, customerId } = req.body;

      addBreadcrumb('Payment processing initiated', 'payment', 'info', {
        amount: amount,
        currency: currency,
        customerId: customerId?.substring(0, 8) + '***', // Partial for privacy
      });

      // Payment validation
      await trackPerformance('payment_validation', async () => {
        addBreadcrumb('Validating payment details', 'payment', 'info');

        if (!amount || amount <= 0) {
          throw new Error('Invalid payment amount');
        }

        if (!paymentMethodId) {
          throw new Error('Payment method required');
        }
      });

      // Process payment with Stripe (or your payment provider)
      const paymentResult = await trackPerformance('stripe_payment_intent', async () => {
        addBreadcrumb('Creating Stripe payment intent', 'payment', 'info', {
          amount: amount,
          currency: currency,
        });

        // Simulate Stripe API call
        const paymentIntent = await createStripePaymentIntent({
          amount,
          currency,
          payment_method: paymentMethodId,
          customer: customerId,
          confirm: true,
        });

        return paymentIntent;
      });

      // Record transaction in database
      const transaction = await trackPerformance('transaction_recording', async () => {
        addBreadcrumb('Recording transaction in database', 'database', 'info', {
          paymentIntentId: paymentResult.id,
          status: paymentResult.status,
        });

        return await saveTransaction({
          paymentIntentId: paymentResult.id,
          amount,
          currency,
          customerId,
          status: paymentResult.status,
        });
      });

      addBreadcrumb('Payment processed successfully', 'payment', 'info', {
        transactionId: transaction.id,
        paymentStatus: paymentResult.status,
      });

      res.json({
        success: true,
        transactionId: transaction.id,
        status: paymentResult.status,
      });
    } catch (error) {
      captureErrorWithContext(error, 'payment_processing', {
        amount: req.body?.amount,
        currency: req.body?.currency,
        customerId: req.body?.customerId?.substring(0, 8) + '***',
        endpoint: '/api/payments/process',
        errorType: error.type || error.name,
        stripeErrorCode: error.code, // If using Stripe
      });

      res.status(500).json({ error: 'Payment processing failed' });
    }
  });
});

/**
 * Example 7: Email Service with Delivery Monitoring
 * Use case: Email sending endpoint with comprehensive email delivery tracking
 */
app.post('/api/notifications/email', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('email_notification', async () => {
    try {
      const { to, subject, template, data } = req.body;

      addBreadcrumb('Email notification initiated', 'email', 'info', {
        recipient: to?.substring(0, 5) + '***',
        template: template,
        subject: subject,
      });

      // Email validation
      await trackPerformance('email_validation', async () => {
        addBreadcrumb('Validating email parameters', 'email', 'info');

        if (!to || !isValidEmail(to)) {
          throw new Error('Invalid recipient email');
        }

        if (!template) {
          throw new Error('Email template required');
        }
      });

      // Template rendering
      const emailContent = await trackPerformance('email_template_rendering', async () => {
        addBreadcrumb('Rendering email template', 'email', 'info', {
          template: template,
          hasData: !!data,
        });

        return await renderEmailTemplate(template, data || {});
      });

      // Email delivery
      const deliveryResult = await trackPerformance('email_delivery', async () => {
        addBreadcrumb('Sending email via provider', 'email', 'info', {
          provider: 'sendgrid', // or your email provider
        });

        return await sendEmail({
          to,
          subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      });

      addBreadcrumb('Email sent successfully', 'email', 'info', {
        messageId: deliveryResult.messageId,
        provider: 'sendgrid',
      });

      res.json({
        success: true,
        messageId: deliveryResult.messageId,
      });
    } catch (error) {
      captureErrorWithContext(error, 'email_service', {
        recipient: req.body?.to?.substring(0, 5) + '***',
        template: req.body?.template,
        subject: req.body?.subject,
        endpoint: '/api/notifications/email',
        emailProvider: 'sendgrid',
      });

      res.status(500).json({ error: 'Failed to send email notification' });
    }
  });
});

/**
 * Example 8: Middleware Function with Request Monitoring
 * Use case: Custom middleware that tracks request processing and adds context
 */
function requestMonitoringMiddleware() {
  return async (req, res, next) => {
    const { addBreadcrumb } = await import('../src/utils/sentry-helpers.js');

    // Add request context as breadcrumb
    addBreadcrumb('Request received', 'http', 'info', {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      clientIP: req.ip,
      contentType: req.get('content-type'),
    });

    // Track request start time
    req.startTime = Date.now();

    // Override res.end to capture response info
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - req.startTime;

      addBreadcrumb('Request completed', 'http', 'info', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });

      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Example 9: Error Recovery with Fallback Mechanisms
 * Use case: Endpoint that demonstrates graceful error handling with fallbacks
 */
app.get('/api/data/analytics', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('analytics_data_fetch', async () => {
    let primaryResult = null;
    let fallbackUsed = false;

    try {
      // Try primary data source first
      primaryResult = await trackPerformance('primary_data_source', async () => {
        addBreadcrumb('Fetching from primary analytics database', 'database', 'info');
        return await getPrimaryAnalyticsData();
      });

      addBreadcrumb('Primary data source successful', 'database', 'info', {
        recordCount: primaryResult?.length || 0,
      });
    } catch (primaryError) {
      addBreadcrumb('Primary data source failed, trying fallback', 'database', 'warning', {
        primaryError: primaryError.message,
      });

      try {
        // Fallback to cached data
        primaryResult = await trackPerformance('fallback_data_source', async () => {
          addBreadcrumb('Fetching from cache fallback', 'cache', 'info');
          return await getCachedAnalyticsData();
        });

        fallbackUsed = true;

        addBreadcrumb('Fallback data source successful', 'cache', 'info', {
          recordCount: primaryResult?.length || 0,
        });
      } catch (fallbackError) {
        // Capture both errors with context
        captureErrorWithContext(primaryError, 'analytics_primary_failure', {
          endpoint: '/api/data/analytics',
          attemptedSource: 'primary_database',
        });

        captureErrorWithContext(fallbackError, 'analytics_fallback_failure', {
          endpoint: '/api/data/analytics',
          attemptedSource: 'cache_fallback',
          primaryErrorMessage: primaryError.message,
        });

        // Return minimal response instead of complete failure
        return res.json({
          data: [],
          error: 'Data temporarily unavailable',
          fallbackUsed: false,
        });
      }
    }

    res.json({
      data: primaryResult,
      fallbackUsed,
      timestamp: new Date().toISOString(),
    });
  });
});

/**
 * Example 10: Batch Operation with Individual Item Tracking
 * Use case: Endpoint that processes multiple items and tracks each one
 */
app.post('/api/batch/process-items', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = await import(
    '../src/utils/sentry-helpers.js'
  );

  return await trackPerformance('batch_processing', async () => {
    try {
      const { items } = req.body;

      addBreadcrumb('Batch processing initiated', 'batch', 'info', {
        itemCount: items?.length || 0,
      });

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
          const result = await trackPerformance(`process_item_${i}`, async () => {
            addBreadcrumb(`Processing item ${i + 1}`, 'batch', 'info', {
              itemId: item.id,
              itemType: item.type,
            });

            return await processIndividualItem(item);
          });

          results.push({ index: i, success: true, result });
        } catch (itemError) {
          errors.push({
            index: i,
            itemId: item.id,
            error: itemError.message,
          });

          captureErrorWithContext(itemError, 'batch_item_processing', {
            itemIndex: i,
            itemId: item.id,
            itemType: item.type,
            batchSize: items.length,
          });

          results.push({ index: i, success: false, error: itemError.message });
        }
      }

      addBreadcrumb('Batch processing completed', 'batch', 'info', {
        totalItems: items.length,
        successfulItems: results.filter(r => r.success).length,
        failedItems: errors.length,
      });

      res.json({
        results,
        summary: {
          total: items.length,
          successful: results.filter(r => r.success).length,
          failed: errors.length,
        },
      });
    } catch (error) {
      captureErrorWithContext(error, 'batch_processing', {
        endpoint: '/api/batch/process-items',
        itemCount: req.body?.items?.length || 0,
      });

      res.status(500).json({ error: 'Batch processing failed' });
    }
  });
});

// Apply the request monitoring middleware to all routes
app.use(requestMonitoringMiddleware());

// Placeholder functions for examples (replace with your actual implementations)
async function getUserById(id) {
  // Your user lookup logic
  return { id, email: 'user@example.com', name: 'John Doe' };
}

async function createProject(projectData) {
  // Your project creation logic
  return { id: 'proj_123', ...projectData, createdAt: new Date() };
}

async function sendProjectCreatedEmail(userId, project) {
  // Your email notification logic
  console.log(`Sending project created email for user ${userId}, project ${project.id}`);
}

async function findUserByEmail(email) {
  // Your user lookup logic
  return { id: 'user_123', email, passwordHash: 'hash', role: 'user' };
}

async function verifyPassword(password, hash) {
  // Your password verification logic
  return password === 'correct_password';
}

async function generateJWTToken(user) {
  // Your JWT token generation logic
  return 'jwt_token_here';
}

async function createStripePaymentIntent(params) {
  // Your Stripe integration
  return { id: 'pi_123', status: 'succeeded' };
}

async function saveTransaction(transactionData) {
  // Your transaction saving logic
  return { id: 'txn_123', ...transactionData };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function renderEmailTemplate(template, data) {
  // Your email template rendering logic
  return { html: '<p>Email content</p>', text: 'Email content' };
}

async function sendEmail(emailData) {
  // Your email sending logic
  return { messageId: 'msg_123' };
}

async function getPrimaryAnalyticsData() {
  // Your primary data source
  return [{ metric: 'value' }];
}

async function getCachedAnalyticsData() {
  // Your cache fallback
  return [{ metric: 'cached_value' }];
}

async function processIndividualItem(item) {
  // Your item processing logic
  return { processed: true, id: item.id };
}

export default app;

/**
 * Key Patterns Demonstrated:
 *
 * 1. **Performance Tracking**: Wrap async operations with trackPerformance()
 * 2. **Error Context**: Use captureErrorWithContext() with relevant metadata
 * 3. **Breadcrumbs**: Add breadcrumbs at key points for debugging trail
 * 4. **Nested Tracking**: Track sub-operations separately for detailed insights
 * 5. **Error Recovery**: Implement fallback mechanisms with proper monitoring
 * 6. **Security Context**: Include security-relevant information in auth flows
 * 7. **Batch Processing**: Track individual items in batch operations
 * 8. **Middleware Integration**: Use Sentry helpers in custom middleware
 * 9. **External Services**: Monitor third-party API calls and retries
 * 10. **Privacy**: Mask sensitive data in breadcrumbs and error context
 *
 * Best Practices:
 * - Always import Sentry helpers at the beginning of async functions
 * - Use descriptive names for performance tracking operations
 * - Include relevant context in error captures
 * - Add breadcrumbs at decision points and state changes
 * - Mask or truncate sensitive data in logs
 * - Track external service calls separately from business logic
 * - Use different error categories for better organization
 * - Include timing and performance metadata in breadcrumbs
 */
