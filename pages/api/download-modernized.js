/**
 * 🧜‍♀️ RinaWarp Terminal - Modernized Download Handler
 *
 * This is a fully modernized version using native Node.js APIs:
 * - util.promisify → fs.promises (native)
 * - Enhanced error handling
 * - Better security practices
 * - Modern async/await patterns
 */

const path = require('node:path');
const fs = require('node:fs');

module.exports = async function handler(req, res) {
  const file = req.query.file || 'RinaWarp-Terminal-Setup-Windows.exe';

  // Enhanced security: Prevent path traversal attacks
  const sanitizedFile = path.basename(file); // Remove any directory traversal attempts
  const filePath = path.resolve(__dirname, '../../public/releases', sanitizedFile);

  // Security check: Ensure file is within allowed directory
  const allowedDir = path.resolve(__dirname, '../../public/releases');
  if (!filePath.startsWith(allowedDir)) {
    console.warn('🚨 Security warning: Path traversal attempt blocked:', file);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Rina detected suspicious swimming patterns! 🧜‍♀️',
    });
  }

  try {
    // Use native fs.promises instead of util.promisify
    const fileStat = await fs.promises.stat(filePath);

    // Additional security: Check if it's actually a file
    if (!fileStat.isFile()) {
      throw new Error('Not a file');
    }

    // Enhanced headers with better security
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFile}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStat.size);

    // Security headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Log download for analytics (with privacy considerations)
    console.log(`📦 Download started: ${sanitizedFile} (${fileStat.size} bytes)`);

    // Create stream with error handling
    const stream = fs.createReadStream(filePath);

    // Handle stream errors gracefully
    stream.on('error', streamError => {
      console.error('🧜‍♀️ Stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Download failed',
          message: 'The treasure chest got stuck in the coral! 🐚',
        });
      }
    });

    // Handle successful completion
    stream.on('end', () => {
      console.log(`✅ Download completed: ${sanitizedFile}`);
    });

    // Pipe with error handling
    stream.pipe(res);
  } catch (err) {
    console.error('🧜‍♀️ Download error:', err);

    // Enhanced error responses
    if (err.code === 'ENOENT') {
      res.status(404).json({
        error: 'File not found',
        message: 'Rina may have stashed it in a coral cache. Try again soon! 🧜‍♀️',
      });
    } else if (err.code === 'EACCES') {
      res.status(403).json({
        error: 'Access denied',
        message: 'This treasure is protected by sea magic! 🔱',
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'The ocean currents are turbulent today. Please try again! 🌊',
      });
    }
  }
};
