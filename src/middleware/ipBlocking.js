// IP Blocking Middleware for Railway
const blockedIPs = new Set([
  '172.70.206.42',
  '172.70.210.54',
  '172.69.17.25',
  // Add more IPs as needed
]);

const ipBlockingMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const forwardedFor = req.get('X-Forwarded-For');

  // Check direct IP
  if (blockedIPs.has(clientIP)) {
    console.log(`🚫 Blocked IP: ${clientIP}`);
    return res.status(403).send('Access denied');
  }

  // Check X-Forwarded-For header for real IP
  if (forwardedFor) {
    const realIP = forwardedFor.split(',')[0].trim();
    if (blockedIPs.has(realIP)) {
      console.log(`🚫 Blocked IP (X-Forwarded-For): ${realIP}`);
      return res.status(403).send('Access denied');
    }
  }

  next();
};

export default ipBlockingMiddleware;
