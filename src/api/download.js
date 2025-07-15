/**
 * RinaWarp Terminal - Download API Handler
 * Secure file downloads with GitHub releases integration
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// GitHub release configuration
const GITHUB_RELEASE_BASE_URL =
  'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download';

const ALLOWED_FILES = {
  // Aliases for easy website integration
  'rinawarp.zip': `${GITHUB_RELEASE_BASE_URL}/rinawarp.zip`,
  portable: `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Portable-Windows.exe`,
  linux: `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Linux.tar.gz`,
  macos: `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-macOS.dmg`,
  setup: `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Setup-Windows.exe`,

  // Exact filenames for direct API access
  'RinaWarp-Terminal-Setup-Windows.exe': `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Setup-Windows.exe`,
  'RinaWarp-Terminal-Portable-Windows.exe': `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Portable-Windows.exe`,
  'RinaWarp-Terminal-Linux.tar.gz': `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Linux.tar.gz`,
  'RinaWarp-Terminal-macOS.dmg': `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-macOS.dmg`,
  'RinaWarp-Terminal-Linux.deb': `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal-Linux.deb`,
  'RinaWarp-Terminal.AppImage': `${GITHUB_RELEASE_BASE_URL}/RinaWarp-Terminal.AppImage`,
};

const PUBLIC_DIR = path.join(__dirname, '../../public');

/**
 * GET /api/download
 * Download RinaWarp Terminal files
 */
router.get('/', (req, res) => {
  const { file } = req.query;

  console.log(`[DOWNLOAD] Request for file: ${file || 'default'} from IP: ${req.ip}`);

  // Default to main installer if no file specified
  const downloadUrl = file ? ALLOWED_FILES[file] : ALLOWED_FILES['setup'];

  if (!downloadUrl) {
    return res.status(400).json({
      error: 'Invalid file requested',
      available: Object.keys(ALLOWED_FILES),
      message: 'Please specify one of the available file types',
      examples: [
        '/api/download - Default Windows installer',
        '/api/download?file=portable - Portable Windows version',
        '/api/download?file=linux - Linux package',
        '/api/download?file=macos - macOS installer',
      ],
    });
  }

  console.log(`[DOWNLOAD] Redirecting to: ${downloadUrl}`);

  // Check for local files in development
  if (process.env.NODE_ENV === 'development') {
    const fileName = downloadUrl.split('/').pop();
    const localPaths = [
      path.join(PUBLIC_DIR, 'releases', fileName),
      path.join(PUBLIC_DIR, fileName),
    ];

    for (const localPath of localPaths) {
      if (fs.existsSync(localPath)) {
        console.log(`[DOWNLOAD] Serving local file: ${localPath}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(localPath);
      }
    }
  }

  // Attempt GitHub API fallback to find exact asset
  const GITHUB_API =
    'https://api.github.com/repos/Rinawarp-Terminal/rinawarp-terminal/releases/latest';

  // Map aliases to actual filenames
  const fileNameMap = {
    portable: 'RinaWarp-Terminal-Portable-Windows.exe',
    linux: 'RinaWarp-Terminal-Linux.tar.gz',
    macos: 'RinaWarp-Terminal-macOS.dmg',
    setup: 'RinaWarp-Terminal-Setup-Windows.exe',
    'rinawarp.zip': 'rinawarp.zip',
  };

  const fileName = fileNameMap[file] || file || 'RinaWarp-Terminal-Setup-Windows.exe';

  const githubFallback = async () => {
    console.log(`[GITHUB FALLBACK] Attempting to find asset: ${fileName}`);

    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'RinaWarp-Terminal-Download-API',
    };

    // Add GitHub token if available
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(GITHUB_API, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}`);
    }

    const release = await response.json();
    const asset = release.assets.find(a => a.name === fileName);

    if (!asset) {
      console.error(`Asset ${fileName} not found in latest GitHub release`);
      // Fall back to direct URL redirect
      console.log(`[GITHUB FALLBACK] Falling back to direct URL: ${downloadUrl}`);
      return res.redirect(302, downloadUrl);
    }

    console.log(`[GITHUB FALLBACK] Redirecting to GitHub asset URL: ${asset.browser_download_url}`);
    res.redirect(302, asset.browser_download_url);
  };

  githubFallback().catch(err => {
    console.error(`[GITHUB FALLBACK ERROR]: ${err.message}`);
    // Final fallback to direct URL
    console.log(`[FALLBACK] Final fallback to direct URL: ${downloadUrl}`);
    res.redirect(302, downloadUrl);
  });
});

/**
 * GET /api/download/info
 * Get information about available downloads
 */
router.get('/info', (req, res) => {
  const downloadInfo = {
    available: Object.keys(ALLOWED_FILES),
    files: {
      setup: {
        name: 'Windows Installer',
        description: 'Full installer with all features',
        platform: 'Windows',
        size: '~45MB',
      },
      portable: {
        name: 'Windows Portable',
        description: 'No installation required',
        platform: 'Windows',
        size: '~35MB',
      },
      linux: {
        name: 'Linux Package',
        description: 'Universal tarball for all distros',
        platform: 'Linux',
        size: '~40MB',
      },
      macos: {
        name: 'macOS Installer',
        description: 'Notarized disk image',
        platform: 'macOS',
        size: '~50MB',
      },
    },
    usage: {
      default: '/api/download',
      specific: '/api/download?file=portable',
      info: '/api/download/info',
    },
  };

  res.json(downloadInfo);
});

export default router;
