export default function handler(req, res) {
  const { file, os } = req.query;

  const fallbackMap = {
    linux: 'RinaWarp-Terminal-Linux.tar.gz',
    windows: 'RinaWarp-Terminal-Setup-Windows.exe',
    mac: 'RinaWarp-Terminal-macOS.dmg',
  };

  const filename = file || fallbackMap[os] || 'RinaWarp-Terminal-Setup-Windows.exe';
  
  // Enhanced logging with user agent and referrer
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const referrer = req.headers['referer'] || 'Direct';
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`[📥 DOWNLOAD] ${timestamp} – ${ip} requested ${filename} | UA: ${userAgent} | Ref: ${referrer}`);
  
  // Redirect to GitHub releases
  const githubUrl = `https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/${filename}`;
  res.redirect(302, githubUrl);
}
