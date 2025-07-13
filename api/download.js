import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const { file } = req.query;

  // Security: Only allow specific files
  const allowedFiles = {
    'rinawarp.zip': 'rinawarp.zip',
    portable: 'RinaWarp-Terminal-Portable-Windows.exe',
    linux: 'RinaWarp-Terminal-Linux.tar.gz',
    macos: 'RinaWarp-Terminal-macOS.dmg',
    setup: 'RinaWarp-Terminal-Setup-Windows.exe',
  };

  // Default to main installer if no file specified
  const fileName = file ? allowedFiles[file] : 'RinaWarp-Terminal-Setup-Windows.exe';

  if (!fileName) {
    return res.status(400).json({
      error: 'Invalid file requested',
      available: Object.keys(allowedFiles),
    });
  }

  try {
    // Try multiple locations for the file
    let _filePath;
    let fileBuffer;

    // First try public/releases directory
    const releasesPath = join(process.cwd(), 'public', 'releases', fileName);
    const publicPath = join(process.cwd(), 'public', fileName);

    try {
      fileBuffer = readFileSync(releasesPath);
      _filePath = releasesPath;
    } catch (err) {
      // If not found in releases, try public directory
      fileBuffer = readFileSync(publicPath);
      _filePath = publicPath;
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send file
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download error:', error);

    // Check if it's a file not found error
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'File not found',
        message: `The requested file "${fileName}" is not available for download.`,
        traceId: req.headers['x-vercel-trace'] || 'unknown',
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to process download request',
      traceId: req.headers['x-vercel-trace'] || 'unknown',
    });
  }
}
