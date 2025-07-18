// Lightweight download redirect API
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Extract file parameter from query string
  const { file, os } = req.query;

  // Define proper ALLOWED_FILES object with correct download URLs for each platform
  const ALLOWED_FILES = {
    // Main application archive
    'rinawarp.zip':
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/rinawarp.zip',

    // Platform-specific downloads
    portable:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Portable-Windows.exe', // Windows portable executable
    linux:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.tar.gz', // Linux tar.gz archive
    macos:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-macOS.dmg', // macOS DMG installer
    setup:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Setup-Windows.exe', // Windows setup executable (default)
  };

  // OS mapping for convenience
  const osMap = {
    linux: 'linux',
    mac: 'macos',
    macos: 'macos',
    windows: 'setup',
    win: 'setup',
  };

  // Determine the file key to use
  let key = file;
  if (!key && os) {
    key = osMap[os.toLowerCase()];
  }

  // Add validation to ensure only allowed files can be downloaded
  if (!key) {
    return res.status(400).json({
      error: 'File parameter is required',
      available: Object.keys(ALLOWED_FILES),
      usage: 'Use ?file=<key> or ?os=<linux|mac|windows>',
    });
  }

  // Get the download URL from ALLOWED_FILES
  const downloadUrl = ALLOWED_FILES[key];

  // Include proper error handling for invalid file requests
  if (!downloadUrl) {
    return res.status(404).json({
      error: 'File not found or not allowed',
      requested: key,
      available: Object.keys(ALLOWED_FILES),
      usage: 'Use ?file=<key> or ?os=<linux|mac|windows>',
    });
  }

  // Log the download (for analytics)
  console.log(
    `Download requested: ${key} from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`
  );

  // Instead of reading files from filesystem, redirect to the actual download URLs
  res.redirect(302, downloadUrl);
}
