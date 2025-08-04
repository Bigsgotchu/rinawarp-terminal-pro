import express from 'express';
const router = express.Router();

router.post('/login', async (req, res) => {
  res.json({
    token: 'mock-jwt-token',
    user: { id: 'test-user', name: 'Test User' },
  });
});

router.post('/register', async (req, res) => {
  res.json({
    message: 'User registered successfully',
    user: { id: 'new-user', name: req.body.name },
  });
});

export default router;
