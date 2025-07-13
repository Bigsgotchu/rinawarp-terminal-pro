/**
 * RinaWarp Terminal - Global Error Handler
 * Provides comprehensive error handling with graceful degradation
 */

export default function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  
  // Log the error with context
  console.error(`🔥 [${timestamp}] Server Error [${requestId}]:`, {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = 500;
  const errorResponse = {
    error: 'Internal Server Error',
    requestId,
    timestamp
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'Validation Error';
    errorResponse.details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error = 'Unauthorized';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    errorResponse.error = err.message || 'Request Error';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorResponse.error = 'File too large';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    errorResponse.error = 'Invalid JSON payload';
  }

  // Add development details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || {};
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] 404 Not Found: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method,
    timestamp,
    suggestions: [
      '/api/status - System status',
      '/api/health - Health check',
      '/api/download - File downloads',
      '/api/stripe-config - Payment configuration'
    ]
  });
}
