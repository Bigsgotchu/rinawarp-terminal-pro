import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RinaWarp AI Cloud Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/readiness', async (req, res) => {
  res.json({
    ready: true,
    services: {
      database: 'ready',
      ai: 'ready',
      cache: 'ready'
    }
  });
});

export default router;
