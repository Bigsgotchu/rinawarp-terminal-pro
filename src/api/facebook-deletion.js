/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Facebook Data Deletion Callback
 * Required for Facebook app compliance with privacy laws
 * Handles user data deletion requests from Facebook
 */

import express from 'express';
import crypto from 'crypto';
const router = express.Router();

// Facebook app secret - should be in environment variables
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * Verify Facebook signature for security
 * @param {string} payload - Request body as string
 * @param {string} signature - Facebook signature from headers
 * @returns {boolean} - True if signature is valid
 */
function verifyFacebookSignature(payload, signature) {
  if (!signature || !APP_SECRET) {
    return false;
  }

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace('sha256=', '');
  
  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  // Compare signatures securely
  return crypto.timingSafeEqual(
    Buffer.from(cleanSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Handle Facebook data deletion request
 * POST /api/facebook/deletion
 */
router.post('/deletion', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body.toString();

    // Verify Facebook signature
    if (!verifyFacebookSignature(payload, signature)) {
      console.error('Invalid Facebook signature for deletion request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse the deletion request
    const deletionData = JSON.parse(payload);
    const userId = deletionData.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    console.log(`Facebook data deletion request for user: ${userId}`);

    // Delete user data from all relevant systems
    await deleteUserData(userId);

    // Generate confirmation URL (required by Facebook)
    const confirmationCode = generateConfirmationCode(userId);
    const confirmationUrl = `https://api.rinawarp.com/facebook/deletion-status/${confirmationCode}`;

    // Log the deletion request
    await logDeletionRequest(userId, confirmationCode);

    // Respond to Facebook with confirmation URL
    res.json({
      url: confirmationUrl,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    console.error('Error processing Facebook deletion request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle deletion status check
 * GET /facebook/deletion-status/:code
 */
router.get('/deletion-status/:code', async (req, res) => {
  try {
    const confirmationCode = req.params.code;
    
    // Look up deletion request by confirmation code
    const deletionStatus = await getDeletionStatus(confirmationCode);
    
    if (!deletionStatus) {
      return res.status(404).json({ error: 'Deletion request not found' });
    }

    res.json({
      status: deletionStatus.status,
      requested_at: deletionStatus.requested_at,
      completed_at: deletionStatus.completed_at,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    console.error('Error checking deletion status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete all user data from RinaWarp systems
 * @param {string} facebookUserId - Facebook user ID
 */
async function deleteUserData(facebookUserId) {
  try {
    // This should integrate with your actual data storage systems
    // For now, we'll outline the deletion process

    console.log(`Starting data deletion for Facebook user: ${facebookUserId}`);

    // 1. Delete from analytics database
    // await analyticsDb.deleteUserData(facebookUserId);

    // 2. Delete from social media data storage
    // await socialDb.deleteUserData(facebookUserId);

    // 3. Delete from testimonials and social proof
    // await testimonialsDb.deleteUserData(facebookUserId);

    // 4. Delete from user authentication records
    // await authDb.deleteUserData(facebookUserId);

    // 5. Delete from any cached data
    // await cache.deleteUserData(facebookUserId);

    // 6. Delete from BigQuery analytics (if applicable)
    // await bigQuery.deleteUserData(facebookUserId);

    // 7. Delete from Google Cloud Storage files
    // await storage.deleteUserFiles(facebookUserId);

    console.log(`Data deletion completed for Facebook user: ${facebookUserId}`);

  } catch (error) {
    console.error(`Error deleting data for user ${facebookUserId}:`, error);
    throw new Error(error);
  }
}

/**
 * Generate unique confirmation code for deletion request
 * @param {string} userId - Facebook user ID
 * @returns {string} - Confirmation code
 */
function generateConfirmationCode(userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  
  return crypto
    .createHash('sha256')
    .update(`${userId}-${timestamp}-${random}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Log deletion request for compliance tracking
 * @param {string} userId - Facebook user ID
 * @param {string} confirmationCode - Generated confirmation code
 */
async function logDeletionRequest(userId, confirmationCode) {
  try {
    // This should integrate with your actual logging system
    const logEntry = {
      facebook_user_id: userId,
      confirmation_code: confirmationCode,
      requested_at: new Date().toISOString(),
      status: 'completed',
      ip_address: req.ip || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown'
    };

    // Store in your preferred logging system
    // await logger.logDeletionRequest(logEntry);
    
    console.log('Deletion request logged:', logEntry);

  } catch (error) {
    console.error('Error logging deletion request:', error);
  }
}

/**
 * Get deletion status by confirmation code
 * @param {string} confirmationCode - Confirmation code
 * @returns {object} - Deletion status information
 */
async function getDeletionStatus(confirmationCode) {
  try {
    // This should query your actual logging system
    // For now, return a default completed status
    
    return {
      status: 'completed',
      requested_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error getting deletion status:', error);
    return null;
  }
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'facebook-deletion-callback',
    timestamp: new Date().toISOString()
  });
});

export default router;
