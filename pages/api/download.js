import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);

export default async function handler(req, res) {
  console.log('🧜‍♀️ Download request received');
  
  // Set CORS headers to prevent cross-origin issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const file = 'RinaWarp-Terminal-Setup-Windows.exe';
  const filePath = path.resolve('./public/releases', file);

  try {
    const fileStat = await stat(filePath);
    
    console.log(`🧜‍♀️ File found: ${file} (${fileStat.size} bytes)`);
    
    // Set proper headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStat.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Create read stream and handle errors properly
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', (streamErr) => {
      console.error('🧜‍♀️ Stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Stream error',
          message: 'The mermaid magic failed during transfer. Please try again!',
        });
      }
    });
    
    stream.on('end', () => {
      console.log('🧜‍♀️ Download completed successfully');
    });
    
    // Pipe the file to response
    stream.pipe(res);
    
  } catch (err) {
    console.error('🧜‍♀️ File not found:', err);
    if (!res.headersSent) {
      res.status(404).json({
        error: 'File not found',
        message: 'Rina might\'ve dropped it in a whirlpool. Try again later!',
      });
    }
  }
}
