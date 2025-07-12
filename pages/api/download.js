// Next.js API route handler
export default function handler(req, res) {
  console.log('🧜‍♀️ Download request received:', req.query);
  
  // Set CORS headers to prevent cross-origin issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Determine which file to redirect to based on query parameter
  let filename;
  const fileType = req.query.file || req.query.platform;
  
  switch (fileType) {
    case 'portable':
      filename = 'RinaWarp-Terminal-Portable-Windows.exe';
      break;
    case 'linux':
      filename = 'RinaWarp-Terminal-Linux.tar.gz';
      break;
    case 'macos':
      filename = 'RinaWarp-Terminal-macOS.dmg';
      break;
    case 'windows':
    default:
      filename = 'RinaWarp-Terminal-Setup-Windows.exe';
      break;
  }
  
  // Redirect to the static file in the public folder
  const fileUrl = `/releases/${filename}`;
  console.log(`🧜‍♀️ Redirecting to: ${fileUrl}`);
  
  res.redirect(302, fileUrl);
}
