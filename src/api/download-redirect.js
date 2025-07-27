import express from 'express';
const router = express.Router();

// GitHub release URLs (update these with actual release URLs)
const DOWNLOAD_URLS = {
  macos:
    'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-macOS.zip',
  windows:
    'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Setup-Windows.exe',
  linux:
    'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.tar.gz',
};

router.get('/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const downloadUrl = DOWNLOAD_URLS[platform];

  if (downloadUrl) {
    // Track download
    console.log(`📥 Download initiated for ${platform}`);
    res.redirect(downloadUrl);
  } else {
    res.status(404).json({ error: 'Invalid platform' });
  }
});

export default router;
