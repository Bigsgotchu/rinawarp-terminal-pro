export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file, os } = req.query;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const timestamp = new Date().toISOString();

  // Map OS to filenames
  const osMap = {
    linux: 'RinaWarp-Terminal-Linux.tar.gz',
    windows: 'RinaWarp-Terminal-Setup-Windows.exe',
    mac: 'RinaWarp-Terminal-macOS.dmg',
  };

  const filename = file || osMap[os];

  if (!filename) {
    return res.status(400).json({
      error: 'Missing or invalid file/os parameter. Use ?file=... or ?os=linux|mac|windows',
    });
  }

  // Log the download request
  console.log(`[📦 DOWNLOAD LOG] ${timestamp} - ${ip} - ${userAgent} - requested ${filename}`);

  // Redirect to the static file
  res.redirect(302, `/releases/${filename}`);
}
