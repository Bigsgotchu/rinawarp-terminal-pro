export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    // Debug information (without exposing the full key)
    const debugInfo = {
      hasSecretKey: !!secretKey,
      keyType: secretKey ? (
        secretKey.startsWith('sk_live_') ? 'LIVE' :
        secretKey.startsWith('sk_test_') ? 'TEST' :
        secretKey.startsWith('{{') ? 'PLACEHOLDER' : 'UNKNOWN'
      ) : 'MISSING',
      keyPrefix: secretKey ? secretKey.substring(0, 15) + '...' : 'N/A',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      details: error.message,
    });
  }
}
