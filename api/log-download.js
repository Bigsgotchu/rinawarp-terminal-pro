export default function handler(req, res) {
  const { os, file } = req.query;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const timestamp = new Date().toISOString();

  res.status(204).end(); // No content, log only
}
