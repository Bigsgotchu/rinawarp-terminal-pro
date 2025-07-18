export default function handler(req, res) {
  res.status(200).json({
    message: 'Hello from RinaWarp Terminal API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url,
  });
}
