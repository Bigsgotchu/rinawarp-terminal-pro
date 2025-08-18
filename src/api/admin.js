/**
 * Admin API Router for RinaWarp Terminal
 * Provides administrative endpoints for managing the application
 */

import express from 'express';
import { requireAdmin, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../database/users.js';
import { getSecretsManager } from '../security/SecretsManager.js';

const router = express.Router();

// All routes in this module require admin privileges
router.use(requireAdmin());

/**
 * Get admin dashboard overview
 */
router.get('/dashboard', (req, res) => {
  const secretsManager = getSecretsManager();

  res.json({
    message: 'Welcome to the RinaWarp Admin Dashboard',
    timestamp: new Date().toISOString(),
    user: req.user,
    server: {
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime(),
    },
    secrets: {
      count: secretsManager.listSecrets().length,
      health: secretsManager.healthCheck(),
    },
  });
});

/**
 * Manage secrets
 */
const secretsRouter = express.Router();
secretsRouter.get('/', requirePermission('admin:settings'), (req, res) => {
  const secretsManager = getSecretsManager();
  res.json(secretsManager.listSecrets());
});

secretsRouter.post('/', requirePermission('admin:settings'), (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  const secretsManager = getSecretsManager();
  const success = secretsManager.setSecret(key, value);

  if (success) {
    res.status(201).json({ message: `Secret '${key}' created successfully` });
  } else {
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

secretsRouter.delete('/:key', requirePermission('admin:settings'), (req, res) => {
  const { key } = req.params;
  const secretsManager = getSecretsManager();
  const success = secretsManager.deleteSecret(key);

  if (success) {
    res.json({ message: `Secret '${key}' deleted successfully` });
  } else {
    res.status(404).json({ error: 'Secret not found' });
  }
});

router.use('/secrets', secretsRouter);

export default router;
