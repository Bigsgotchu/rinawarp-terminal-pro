import React, { useState, useEffect } from 'react';
import { Download, Apple, MonitorSmartphone, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function DownloadPage() {
  const [platform, setPlatform] = useState('mac');
  const [version, setVersion] = useState('0.1.0');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('mac') !== -1) {
      setPlatform('mac');
    } else if (userAgent.indexOf('win') !== -1) {
      setPlatform('windows');
    } else if (userAgent.indexOf('linux') !== -1) {
      setPlatform('linux');
    }

    // Fetch latest version
    fetchLatestVersion();
  }, []);

  const fetchLatestVersion = async () => {
    try {
      const workerUrl = process.env.REACT_APP_CLOUDFLARE_WORKER_URL || 'https://updates.rinawarp.com';
      const response = await axios.get(`${workerUrl}/api/updates/latest`);
      if (response.data.version) {
        setVersion(response.data.version);
      }
    } catch (error) {
      console.error('Failed to fetch latest version:', error);
    }
  };

  const getDownloadUrl = (os) => {
    const workerUrl = process.env.REACT_APP_CLOUDFLARE_WORKER_URL || 'https://updates.rinawarp.com';
    const baseUrl = `${workerUrl}/download/v${version}`;
    
    switch (os) {
      case 'mac':
        return `${baseUrl}/RinaWarp-Terminal-Pro-${version}.dmg`;
      case 'windows':
        return `${baseUrl}/RinaWarp-Terminal-Pro-Setup-${version}.exe`;
      case 'linux':
        return `${baseUrl}/RinaWarp-Terminal-Pro-${version}.AppImage`;
      default:
        return '';
    }
  };

  const handleDownload = async (os) => {
    setDownloading(true);
    try {
      const url = getDownloadUrl(os);
      window.location.href = url;
      toast.success('Download started!', {
        description: 'Check your downloads folder',
      });
    } catch (error) {
      toast.error('Download failed', {
        description: 'Please try again or contact support',
      });
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const platforms = [
    {
      id: 'mac',
      name: 'macOS',
      icon: Apple,
      desc: 'macOS 11.0 or later',
      file: '.dmg',
      size: '~120 MB',
    },
    {
      id: 'windows',
      name: 'Windows',
      icon: MonitorSmartphone,
      desc: 'Windows 10 or later',
      file: '.exe',
      size: '~130 MB',
    },
    {
      id: 'linux',
      name: 'Linux',
      icon: MonitorSmartphone,
      desc: 'Ubuntu 20.04+ / Debian 11+',
      file: '.AppImage',
      size: '~125 MB',
    },
  ];

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6 px-4 py-2 glass rounded-full">
            <span className="text-sm text-[#4dd4d4]">Latest Version: v{version}</span>
          </div>
          <h1 className="text-5xl font-bold mb-6">Download RinaWarp Terminal Pro</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your platform and start building with proof-first agent runs
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {platforms.map((p) => {
            const Icon = p.icon;
            const isRecommended = p.id === platform;
            return (
              <div
                key={p.id}
                data-testid={`download-${p.id}`}
                className={`glass p-8 rounded-2xl hover:border-[#4dd4d4]/30 transition relative ${
                  isRecommended ? 'border-[#4dd4d4]/50' : ''
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#4dd4d4] to-[#3ac4c4] rounded-full text-xs font-semibold text-black">
                    Recommended
                  </div>
                )}
                <div className="text-center">
                  <Icon size={48} className="mx-auto mb-4 text-[#4dd4d4]" />
                  <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={16} className="text-[#4dd4d4]" />
                      <span>Format: {p.file}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={16} className="text-[#4dd4d4]" />
                      <span>Size: {p.size}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(p.id)}
                    disabled={downloading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#ff5a78] to-[#ff3d5e] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff5a78]/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Download size={18} />
                    <span>{downloading ? 'Starting...' : 'Download'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Installation Guide */}
        <div className="glass p-8 rounded-2xl mb-12">
          <h2 className="text-2xl font-bold mb-6">Installation Guide</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-[#4dd4d4]">⌘ macOS</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Download and open the .dmg file</li>
                <li>Drag RinaWarp Terminal Pro to Applications</li>
                <li>Launch from Applications or Spotlight</li>
                <li>If prompted, allow in System Preferences → Security & Privacy</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-[#4dd4d4]">🖥️ Windows</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Run the downloaded .exe installer</li>
                <li>Follow the installation wizard</li>
                <li>Launch from Start Menu or Desktop shortcut</li>
                <li>Windows Defender may ask for confirmation - click "Allow"</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-[#4dd4d4]">🐧 Linux</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Make the AppImage executable: chmod +x RinaWarp-Terminal-Pro-*.AppImage</li>
                <li>Run: ./RinaWarp-Terminal-Pro-*.AppImage</li>
                <li>Optionally integrate with AppImageLauncher</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="glass p-8 rounded-2xl">
          <h2 className="text-2xl font-bold mb-6">System Requirements</h2>
          <div className="grid md:grid-cols-2 gap-6 text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Minimum</h3>
              <ul className="space-y-2 text-sm">
                <li>• 4 GB RAM</li>
                <li>• 500 MB disk space</li>
                <li>• Internet connection (for updates)</li>
                <li>• MongoDB (optional, for local runs)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Recommended</h3>
              <ul className="space-y-2 text-sm">
                <li>• 8 GB RAM or more</li>
                <li>• 1 GB disk space</li>
                <li>• Broadband internet</li>
                <li>• MongoDB installed locally</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need help? Check our{' '}
            <a href="#" className="text-[#4dd4d4] hover:underline">
              documentation
            </a>{' '}
            or{' '}
            <a href="#" className="text-[#4dd4d4] hover:underline">
              contact support
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            By downloading, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
