/**
 * RinaWarp Terminal - Status API Handler
 * Provides real-time system status information.
 */

import { Router } from 'express';

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

export default router;
