module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get platform parameter
  const platform = req.query.platform || req.query.file || 'windows';

  // Map platform to filename
  const fileMap = {
    portable: 'RinaWarp-Terminal-Portable-Windows.exe',
    linux: 'RinaWarp-Terminal-Linux.tar.gz',
    macos: 'RinaWarp-Terminal-macOS.dmg',
    windows: 'RinaWarp-Terminal-Setup-Windows.exe',
  };

  const filename = fileMap[platform] || fileMap.windows;
  const fileUrl = `/releases/${filename}`;

  // Redirect to static file
  res.redirect(302, fileUrl);
};
