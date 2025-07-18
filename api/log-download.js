export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract the file parameter from req.query
  const { file } = req.query;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const timestamp = new Date().toISOString();

  // Define allowed files list
  const allowedFiles = [
    'RinaWarp-Terminal-Linux.tar.gz',
    'RinaWarp-Terminal-Setup-Windows.exe',
    'RinaWarp-Terminal-macOS.dmg',
  ];

  // Default to the Windows setup installer if no file is specified
  const requestedFile = file || 'RinaWarp-Terminal-Setup-Windows.exe';

  // Validate that the requested file is in the allowed list
  if (!allowedFiles.includes(requestedFile)) {
    return res.status(400).json({
      error: 'Invalid file requested',
      available_files: allowedFiles,
    });
  }

  // Log the download request
  console.log(`[📦 DOWNLOAD LOG] ${timestamp} - ${ip} - ${userAgent} - requested ${requestedFile}`);

  // Redirect to the appropriate download URL using a 302 status code
  res.redirect(302, `/releases/${requestedFile}`);
}
