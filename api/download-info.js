export default function handler(req, res) {
  res.status(200).json({
    available: [
      'setup',
      'portable',
      'linux',
      'macos',
      'rinawarp.zip',
      'appimage',
      'deb',
      'rpm'
    ],
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
        format: 'exe'
      },
      portable: {
        name: 'Portable Windows',
        description: 'No installation required',
        size: '~194MB',
        platform: 'Windows',
        format: 'exe'
      },
      linux: {
        name: 'Linux Tarball',
        description: 'Universal package for all distros',
        size: '~108MB',
        platform: 'Linux',
        format: 'tar.gz'
      },
      macos: {
        name: 'macOS Installer',
        description: 'Notarized disk image',
        size: '~108MB',
        platform: 'macOS',
        format: 'dmg'
      },
      appimage: {
      appimage: inux AppImage',
              pt              pt     application',
        size: '~192MB',
        platform: 'Linux',
        format: 'AppImage'
      },
      deb: {
        name: 'Debian Package',
        description: 'For Debian/Ubuntu systems',
        size: '~108MB',
        platform: 'Linux',
        format: 'deb'
      },
      rpm: {
        name: 'RPM Package',
        description: 'For Red Hat/CentOS/Fedora systems',
        size: '~108MB',
        platform: 'Linux',
        format: 'rpm'
      }
    },
    metadata: {
      version: '1.0.18',
      releaseDate: '2025-07-18',
      features: [
        'AI-powered terminal assistance',
        'Advanced p        'Advanced p        'Advanced p        'Advanced           'Advanced p   eatures',
        'Cloud sync        'Cloud sync    Multi-platform support'
      ]
    }
  });
}
