/**
 * RinaWarp Terminal - Status API Handler
 * Provides real-time system status information.
 */

import { Router } from 'express';
import { execSync } from 'child_process';

const router = Router();

/**
 * GET /api/status
 * Returns the health and status of the RinaWarp API
 */
router.get('/', (req, res) => {
  const status = {
    status: 'ok',
    version: process.env.APP_VERSION || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      cpuLoad: process.cpuUsage().user / 1000000, // Convert to milliseconds
      memoryUsage: process.memoryUsage(), // Detailed memory info
    },
  };

  res.status(200).json(status);
});

/**
 * GET /api/status/devices
 * Returns connected device information
 */
router.get('/devices', (req, res) => {
  try {
    const devices = {
      iPhone: false,
      deviceDetails: null,
      timestamp: new Date().toISOString(),
    };

    // Check for iPhone connection
    try {
      const iPhoneCheck = execSync(
        'system_profiler SPUSBDataType | grep -q "iPhone" && echo "connected" || echo "disconnected"',
        { encoding: 'utf8', timeout: 5000 }
      )
        .toString()
        .trim();

      devices.iPhone = iPhoneCheck === 'connected';

      // If iPhone is connected, get device details
      if (devices.iPhone) {
        const deviceInfo = execSync('system_profiler SPUSBDataType | grep -A 10 "iPhone:"', {
          encoding: 'utf8',
          timeout: 5000,
        }).toString();

        // Parse device information
        const serialMatch = deviceInfo.match(/Serial Number: ([A-Z0-9]+)/);
        const productMatch = deviceInfo.match(/Product ID: (0x[a-fA-F0-9]+)/);
        const speedMatch = deviceInfo.match(/Speed: (.+)/);

        devices.deviceDetails = {
          serialNumber: serialMatch ? serialMatch[1] : null,
          productId: productMatch ? productMatch[1] : null,
          connectionSpeed: speedMatch ? speedMatch[1] : null,
          deviceType: 'iPhone',
        };
      }
    } catch (error) {
      console.warn('Failed to check iPhone status:', error.message);
    }

    res.status(200).json(devices);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to detect devices',
      details: error.message,
    });
  }
});

/**
 * GET /api/status/device-status
 * Simple iPhone connection check
 */
router.get('/device-status', (req, res) => {
  try {
    const result = execSync(
      'system_profiler SPUSBDataType | grep -q "iPhone" && echo "connected" || echo "disconnected"',
      { encoding: 'utf8', timeout: 5000 }
    )
      .toString()
      .trim();

    res.status(200).json({
      iPhone: result === 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to detect iPhone',
      details: error.message,
    });
  }
});

export default router;
