// Simple download info API without authentication
export default function handler(req, res) {
  // Set CORS headers for cross-origin requests
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

  res.status(200).json({
    available: ['setup', 'portable', 'linux', 'macos', 'rinawarp.zip', 'appimage', 'deb', 'rpm'],
    usage: {
      default: '/api/download',
      specific: '/api/download?file=portable',
      info: '/api/download-info',
    },
    files: {
      setup: {
        name: 'Windows Installer',
        description: 'Full installer with all features',
        size: '~194MB',
        platform: 'Windows',
        format: 'exe',
      },
      portable: {
        name: 'Portable Windows',
        description: 'No installation required',
        size: '~194MB',
        platform: 'Windows',
        format: 'exe',
      },
      linux: {
        name: 'Linux Tarball',
        description: 'Universal package for all distros',
        size: '~108MB',
        platform: 'Linux',
        format: 'tar.gz',
      },
      macos: {
        name: 'macOS Installer',
        description: 'Notarized disk image',
        size: '~108MB',
        platform: 'macOS',
        format: 'dmg',
      },
      appimage: {
        name: 'Linux AppImage',
        description: 'Portable Linux application',
        size: '~192MB',
        platform: 'Linux',
        format: 'AppImage',
      },
      deb: {
        name: 'Debian Package',
        description: 'For Debian/Ubuntu systems',
        size: '~108MB',
        platform: 'Linux',
        format: 'deb',
      },
      rpm: {
        name: 'RPM Package',
        description: 'For Red Hat/CentOS/Fedora systems',
        size: '~108MB',
        ormat: 'rpm',
      },
    },
    metadata: {
      version: '1.0.18',
      releaseDate: '2025-07-18',
      features: [
        'AI-powered terminal assistance',
        'Advanced plugin system',
        'Voice recognition support',
        'Enhanced security features',
        'Cloud synchronization',
        'Multi-platform support',
      ],
    },
  });
}
