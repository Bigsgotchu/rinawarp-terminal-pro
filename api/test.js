export default function handler(req, res) {
  res.status(200).json({
    message: '🧜‍♀️ RinaWarp Terminal API is working perfectly!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    environment: process.env.NODE_ENV || 'development',
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-vercel-trace': req.headers['x-vercel-trace']
    }
  });
}
