import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);

export default async function handler(req, res) {
  const file = 'RinaWarp-Terminal-Setup-Windows.exe';
  const filePath = path.resolve('./public/releases', file);

  try {
    const fileStat = await stat(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStat.size);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('🧜‍♀️ File not found:', err);
    res.status(404).json({
      error: 'File not found',
      message: 'Rina might’ve dropped it in a whirlpool. Try again later!',
    });
  }
}
