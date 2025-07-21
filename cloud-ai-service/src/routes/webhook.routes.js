import express from 'express';
const router = express.Router();

router.post('/stripe', async (req, res) => {
  console.log('Stripe webhook received:', req.body.type);
  res.json({ received: true });
});

router.post('/github', async (req, res) => {
  console.log('GitHub webhook received:', req.headers['x-github-event']);
  res.json({ received: true });
});

export default router;
