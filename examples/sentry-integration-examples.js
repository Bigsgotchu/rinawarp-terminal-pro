/**
 * Sentry Integration Examples for RinaWarp Terminal
 *
 * This file demonstrates practical usage of the Sentry helpers in real Express routes
 * and API endpoints. Use these patterns throughout your application for better error
 * tracking, performance monitoring, and debugging.
 */

import express from 'express';

// Example 1: Basic Express route with error monitoring
const exampleRouter = express.Router();

// User registration endpoint with comprehensive monitoring
exampleRouter.post('/api/users/register', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb, wrapRouteHandler } =
    await import('../src/utils/sentry-helpers.js');

  return await wrapRouteHandler(
    async () => {
      const { email, password, firstName, lastName } = req.body;

      // Add breadcrumb for user registration attempt
      addBreadcrumb('User registration attempt', 'user', 'info', {
        email: email,
        hasPassword: !!password,
        timestamp: new Date().toISOString(),
      });

      // Validate input
      if (!email || !password) {
        const error = new Error('Email and password are required');
        captureErrorWithContext(error, 'validation', {
          email: email,
          missingFields: {
            email: !email,
            password: !password,
          },
        });
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check if user already exists (with performance tracking)
      const existingUser = await trackPerformance('user_lookup', async () => {
        // Simulate database lookup
        return await checkUserExists(email);
      });

      if (existingUser) {
        addBreadcrumb('User already exists', 'user', 'warning', { email });
        return res.status(409).json({ error: 'User already exists' });
      }

      // Create user with performance monitoring
      const newUser = await trackPerformance('user_creation', async () => {
        // Simulate user creation
        return await createUser({ email, password, firstName, lastName });
      });

      addBreadcrumb('User created successfully', 'user', 'info', {
        userId: newUser.id,
        email: newUser.email,
      });

      res.status(201).json({
        message: 'User created successfully',
        userId: newUser.id,
      });
    },
    res,
    'user_registration'
  );
});

// Example 2: API endpoint with database monitoring
exampleRouter.get('/api/analytics/reports/:reportId', async (req, res) => {
  const {
    captureErrorWithContext,
    trackPerformance,
    addBreadcrumb,
    wrapRouteHandler,
    monitorDatabaseCall,
  } = await import('../src/utils/sentry-helpers.js');

  return await wrapRouteHandler(
    async () => {
      const { reportId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      addBreadcrumb('Analytics report requested', 'analytics', 'info', {
        reportId,
        startDate,
        endDate,
        format,
      });

      // Validate report ID
      if (!reportId || !reportId.match(/^[0-9a-f]{24}$/)) {
        const error = new Error('Invalid report ID format');
        captureErrorWithContext(error, 'validation', { reportId });
        return res.status(400).json({ error: 'Invalid report ID' });
      }

      // Fetch report data with database monitoring
      const reportData = await monitorDatabaseCall('reports', 'findById', async () => {
        // Simulate complex database query
        const data = await fetchReportData(reportId, { startDate, endDate });

        if (!data) {
          throw new Error(`Report ${reportId} not found`);
        }

        return data;
      });

      // Process and format data
      const processedData = await trackPerformance('data_processing', async () => {
        return await processReportData(reportData, format);
      });

      addBreadcrumb('Report generated successfully', 'analytics', 'info', {
        reportId,
        dataPoints: processedData.length,
        processingTime: Date.now(),
      });

      res.json({
        reportId,
        data: processedData,
        metadata: {
          generatedAt: new Date().toISOString(),
          format,
          recordCount: processedData.length,
        },
      });
    },
    res,
    'analytics_report_generation'
  );
});

// Example 3: File upload endpoint with comprehensive monitoring
exampleRouter.post('/api/files/upload', async (req, res) => {
  const {
    captureErrorWithContext,
    trackPerformance,
    addBreadcrumb,
    wrapRouteHandler,
    monitorApiCall,
  } = await import('../src/utils/sentry-helpers.js');

  return await wrapRouteHandler(
    async () => {
      const file = req.file;
      const { userId, category = 'general' } = req.body;

      addBreadcrumb('File upload started', 'upload', 'info', {
        filename: file?.originalname,
        size: file?.size,
        mimetype: file?.mimetype,
        userId,
        category,
      });

      // Validate file
      if (!file) {
        const error = new Error('No file provided');
        captureErrorWithContext(error, 'validation', { userId });
        return res.status(400).json({ error: 'No file provided' });
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const error = new Error('File too large');
        captureErrorWithContext(error, 'validation', {
          fileSize: file.size,
          maxSize,
          filename: file.originalname,
        });
        return res.status(413).json({ error: 'File size exceeds 10MB limit' });
      }

      // Scan file for viruses (simulated)
      const scanResult = await trackPerformance('virus_scan', async () => {
        return await scanFileForViruses(file.buffer);
      });

      if (!scanResult.clean) {
        const error = new Error('File failed security scan');
        captureErrorWithContext(error, 'security', {
          filename: file.originalname,
          threatDetected: scanResult.threat,
        });
        return res.status(422).json({ error: 'File failed security scan' });
      }

      // Upload to cloud storage with API monitoring
      const uploadResult = await monitorApiCall('cloudStorage', 'upload', async () => {
        return await uploadToCloudStorage(file, {
          userId,
          category,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        });
      });

      addBreadcrumb('File uploaded successfully', 'upload', 'info', {
        fileId: uploadResult.fileId,
        url: uploadResult.url,
        userId,
      });

      res.json({
        message: 'File uploaded successfully',
        fileId: uploadResult.fileId,
        url: uploadResult.url,
        size: file.size,
        type: file.mimetype,
      });
    },
    res,
    'file_upload'
  );
});

// Example 4: Background job processing with monitoring
async function processEmailQueue() {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb, setUserContext } = await import(
    '../src/utils/sentry-helpers.js'
  );

  while (true) {
    try {
      addBreadcrumb('Processing email queue', 'job', 'info', {
        timestamp: new Date().toISOString(),
      });

      // Get next email job
      const emailJob = await trackPerformance('email_queue_fetch', async () => {
        return await getNextEmailJob();
      });

      if (!emailJob) {
        // No jobs to process, wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Set user context for this job
      setUserContext({
        id: emailJob.userId,
        email: emailJob.recipientEmail,
      });

      addBreadcrumb('Processing email job', 'email', 'info', {
        jobId: emailJob.id,
        type: emailJob.type,
        recipientEmail: emailJob.recipientEmail,
      });

      // Process email with performance monitoring
      await trackPerformance('email_processing', async () => {
        try {
          await sendEmail(emailJob);
          await markJobAsCompleted(emailJob.id);

          addBreadcrumb('Email sent successfully', 'email', 'info', {
            jobId: emailJob.id,
            recipientEmail: emailJob.recipientEmail,
          });
        } catch (emailError) {
          // Capture email-specific errors with context
          captureErrorWithContext(emailError, 'email', {
            jobId: emailJob.id,
            recipientEmail: emailJob.recipientEmail,
            emailType: emailJob.type,
            retryCount: emailJob.retryCount || 0,
          });

          // Mark job for retry or as failed
          if (emailJob.retryCount < 3) {
            await scheduleJobRetry(emailJob.id, emailJob.retryCount + 1);
          } else {
            await markJobAsFailed(emailJob.id, emailError.message);
          }
        }
      });
    } catch (queueError) {
      captureErrorWithContext(queueError, 'job', {
        component: 'email_queue_processor',
        timestamp: new Date().toISOString(),
      });

      // Wait before retrying to avoid rapid error loops
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Example 5: Express middleware with monitoring
function createAuthenticationMiddleware() {
  return async (req, res, next) => {
    const { captureErrorWithContext, addBreadcrumb, setUserContext } = await import(
      '../src/utils/sentry-helpers.js'
    );

    try {
      const authHeader = req.headers.authorization;

      addBreadcrumb('Authentication check', 'auth', 'info', {
        hasAuthHeader: !!authHeader,
        path: req.path,
        method: req.method,
      });

      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');

      // Verify token
      const user = await verifyJwtToken(token);

      if (!user) {
        const error = new Error('Invalid token');
        captureErrorWithContext(error, 'auth', {
          tokenPresent: !!token,
          path: req.path,
        });
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Set user context for Sentry
      setUserContext({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      addBreadcrumb('User authenticated', 'auth', 'info', {
        userId: user.id,
        role: user.role,
      });

      req.user = user;
      next();
    } catch (error) {
      captureErrorWithContext(error, 'auth', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
      });
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

// Example 6: WebSocket connection monitoring
function setupWebSocketMonitoring(io) {
  return async socket => {
    const { captureErrorWithContext, addBreadcrumb, setUserContext } = await import(
      '../src/utils/sentry-helpers.js'
    );

    addBreadcrumb('WebSocket connection established', 'websocket', 'info', {
      socketId: socket.id,
      origin: socket.handshake.headers.origin,
    });

    // Set user context if available
    if (socket.userId) {
      setUserContext({
        id: socket.userId,
        socketId: socket.id,
      });
    }

    socket.on('join_room', async roomId => {
      try {
        addBreadcrumb('User joining room', 'websocket', 'info', {
          socketId: socket.id,
          roomId,
        });

        // Validate room access
        const hasAccess = await checkRoomAccess(socket.userId, roomId);

        if (!hasAccess) {
          const error = new Error('Access denied to room');
          captureErrorWithContext(error, 'websocket', {
            userId: socket.userId,
            roomId,
            socketId: socket.id,
          });
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(roomId);
        socket.emit('joined_room', { roomId });
      } catch (error) {
        captureErrorWithContext(error, 'websocket', {
          event: 'join_room',
          socketId: socket.id,
          roomId,
        });
      }
    });

    socket.on('disconnect', reason => {
      addBreadcrumb('WebSocket disconnected', 'websocket', 'info', {
        socketId: socket.id,
        reason,
        userId: socket.userId,
      });
    });

    socket.on('error', error => {
      captureErrorWithContext(error, 'websocket', {
        socketId: socket.id,
        userId: socket.userId,
      });
    });
  };
}

// Mock functions for examples (replace with your actual implementations)
async function checkUserExists(email) {
  // Simulate database check
  return Math.random() > 0.8; // 20% chance user exists
}

async function createUser(userData) {
  // Simulate user creation
  return {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
  };
}

async function fetchReportData(reportId, filters) {
  // Simulate database query
  if (Math.random() > 0.9) {
    return null; // 10% chance report not found
  }

  return Array.from({ length: Math.floor(Math.random() * 100) }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
  }));
}

async function processReportData(data, format) {
  // Simulate data processing
  await new Promise(resolve => setTimeout(resolve, 100));

  if (format === 'csv') {
    return data.map(item => `${item.id},${item.value},${item.timestamp}`);
  }

  return data;
}

async function scanFileForViruses(buffer) {
  // Simulate virus scan
  await new Promise(resolve => setTimeout(resolve, 200));

  return {
    clean: Math.random() > 0.05, // 5% chance of threat
    threat: Math.random() > 0.05 ? null : 'trojan.generic',
  };
}

async function uploadToCloudStorage(file, options) {
  // Simulate cloud upload
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (Math.random() > 0.95) {
    throw new Error('Cloud storage service unavailable');
  }

  return {
    fileId: 'file_' + Math.random().toString(36).substr(2, 9),
    url: `https://storage.example.com/files/${file.originalname}`,
  };
}

async function getNextEmailJob() {
  // Simulate job queue
  if (Math.random() > 0.3) {
    return null; // No jobs 70% of the time
  }

  return {
    id: 'job_' + Math.random().toString(36).substr(2, 9),
    type: ['welcome', 'notification', 'marketing'][Math.floor(Math.random() * 3)],
    userId: 'user_123',
    recipientEmail: 'user@example.com',
    retryCount: 0,
  };
}

async function sendEmail(job) {
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 500));

  if (Math.random() > 0.9) {
    throw new Error('SMTP server connection failed');
  }
}

async function markJobAsCompleted(jobId) {
  // Simulate database update
  console.log(`Job ${jobId} marked as completed`);
}

async function scheduleJobRetry(jobId, retryCount) {
  // Simulate retry scheduling
  console.log(`Job ${jobId} scheduled for retry #${retryCount}`);
}

async function markJobAsFailed(jobId, error) {
  // Simulate failure logging
  console.log(`Job ${jobId} marked as failed: ${error}`);
}

async function verifyJwtToken(token) {
  // Simulate JWT verification
  if (token === 'invalid') {
    return null;
  }

  return {
    id: 'user_123',
    email: 'user@example.com',
    role: 'user',
  };
}

async function checkRoomAccess(userId, roomId) {
  // Simulate room access check
  return Math.random() > 0.1; // 90% chance of access
}

export default exampleRouter;
export { processEmailQueue, createAuthenticationMiddleware, setupWebSocketMonitoring };
