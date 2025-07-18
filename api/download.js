// Lightweight redirect handler - no file system operations
export default async function handler(req, res) {
  const { file, os } = req.query;

  // Remote URLs for all downloadable files
  const ALLOWED_FILES = {
    'rinawarp.zip':
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/rinawarp.zip',
    portable:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Portable-Windows.exe',
    linux:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.tar.gz',
    macos:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-macOS.dmg',
    setup:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Setup-Windows.exe',
    appimage:
      'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.AppImage',
    deb: 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.deb',
    rpm: 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.rpm',
  };

  // OS mapping for convenience
  const osMap = {
    linux: 'linux',
    mac: 'macos',
    macos: 'macos',
    windows: 'setup',
    win: 'setup',
  };

  // Determine which file to download
  const key = file || osMap[os] || 'setup';
  const downloadUrl = ALLOWED_FILES[key];

  if (!downloadUrl) {
    return res.status(400).json({
      error: 'Invalid file requested',
      available: Object.keys(ALLOWED_FILES),
      usage: 'Use ?file=<key> or ?os=<linux|mac|windows>',
    });
  }

  // Log the download (optional - for analytics)
  console.log(
    `Download requested: ${key} from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`
  );

  // Redirect to the actual download URL
  res.redirect(302, downloadUrl);
}
