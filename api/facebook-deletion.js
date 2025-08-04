// Vercel serverless function for Facebook data deletion callback
// This handles Facebook's data deletion requests properly

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET request (for testing)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'RinaWarp Facebook Data Deletion Callback',
      service: 'active',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Facebook POST request for data deletion
  if (req.method === 'POST') {
    try {
      const { user_id } = req.body;

      // Log the deletion request (in production, this would trigger actual deletion)

      // Generate a confirmation code
      const confirmationCode = generateConfirmationCode(user_id);

      // Create confirmation URL
      const confirmationUrl = `https://rinawarp-facebook-deletion.vercel.app/status/${confirmationCode}`;

      // Return the response Facebook expects
      return res.status(200).json({
        url: confirmationUrl,
        confirmation_code: confirmationCode,
      });
    } catch (error) {
      console.error('Error processing deletion request:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to process deletion request',
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET and POST methods are supported',
  });
}

// Generate a unique confirmation code
function generateConfirmationCode(_userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `del_${timestamp}_${random}`;
}
