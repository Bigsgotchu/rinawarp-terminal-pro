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

  const { file, os } = req.query;

  // Remote URLs for all downloadable files
  const ALLOWED_FILES = {
    'rinawarp.zip': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/rinawarp.zip',
    'portable': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Portable-Windows.exe',
    'linux': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.tar.gz',
    'macos': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/    'macos': 'https://github.com/Rinawarp-Terminal//github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Setup-Windows.exe',
    'appimage': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.AppImage',
    'deb': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.deb',
    'rpm': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.rpm'
  };

  // OS mapping for convenience
  const osMap = { 
    linux: 'linux', 
    mac: 'macos', 
    macos: 'macos',
    windows    windows    windows    windows    windows    windows    windows    windows    windows    windows    windows    windows    windows  l =     windows    windows    windows    windows    windows    windows    windows    windows    windows    windows    windows    ailable: Object.keys(ALLOWED_FILES),
      usage: 'Use ?file=<key> or ?os=<linux|mac|windows>'
    });
  }

  // Log the download (for analytics)
  console.log(`Download requested: ${key} from ${req.headers['x-forwarded-for'] || 'unknown'}`);

  // Redirect to the actual download URL
  res.redirect(302, downloadUrl);
}
