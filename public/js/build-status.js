// Dynamic Build Status Checker for RinaWarp Terminal
class BuildStatusChecker {
    constructor() {
        this.statusCache = null;
        this.lastCheck = null;
        this.checkInterval = 5 * 60 * 1000; // 5 minutes
    }

    async checkBuildStatus() {
        try {
            // Try to fetch the build status JSON first
            const response = await fetch('/releases/build-status.json');
            if (response.ok) {
                const status = await response.json();
                this.statusCache = status;
                this.lastCheck = Date.now();
                return status;
            }
        } catch (error) {
        }

        // Fallback: check individual files
        return await this.checkFilesDirectly();
    }

    async checkFilesDirectly() {
        const files = {
            'macos': '/releases/RinaWarp-Terminal-macOS.dmg',
            'windows': '/releases/RinaWarp-Terminal-Setup-Windows.exe',
            'linux': '/releases/RinaWarp-Terminal-Linux.tar.gz'
        };

        const status = {
            buildTime: new Date().toISOString(),
            version: '1.1.0',
            builds: {}
        };

        for (const [platform, url] of Object.entries(files)) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                status.builds[platform] = response.ok && response.headers.get('content-length') > 1000;
            } catch {
                status.builds[platform] = false;
            }
        }

        this.statusCache = status;
        this.lastCheck = Date.now();
        return status;
    }

    async getStatus() {
        if (!this.statusCache || (Date.now() - this.lastCheck > this.checkInterval)) {
            return await this.checkBuildStatus();
        }
        return this.statusCache;
    }

    async updateDownloadButtons() {
        const status = await this.getStatus();
        const downloadCards = document.querySelectorAll('.download-card');

        downloadCards.forEach(card => {
            const platform = this.getPlatformFromCard(card);
            const downloadBtn = card.querySelector('.download-btn');
            const platformInfo = card.querySelector('.platform-info');
            
            if (!downloadBtn) return;

            if (status.builds[platform]) {
                // Real build available
                downloadBtn.style.background = 'linear-gradient(135deg, #00ff88, #00d4aa)';
                downloadBtn.style.color = '#001122';
                downloadBtn.textContent = downloadBtn.textContent.includes('📥') ? 
                    downloadBtn.textContent : `📥 ${downloadBtn.textContent.replace(/^[^\s]+\s/, '')}`;
                
                if (platformInfo) {
                    const sizeSpan = platformInfo.querySelector('span:first-child');
                    if (sizeSpan && sizeSpan.textContent.includes('~')) {
                        sizeSpan.style.color = '#00ff88';
                        sizeSpan.style.fontWeight = 'bold';
                    }
                }
            } else {
                // Placeholder only
                downloadBtn.style.background = 'linear-gradient(135deg, #ff6b9d, #ff1493)';
                downloadBtn.style.color = '#ffffff';
                downloadBtn.textContent = '📧 Coming Soon - Get Notified';
                downloadBtn.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = `mailto:rinawarptechnologies25@gmail.com?subject=Notify me when ${platform} version is ready&body=Hi! Please notify me when the RinaWarp Terminal ${platform} version is available for download.%0A%0AThanks!`;
                };
            }
        });

        // Update status indicator if present
        this.updateStatusIndicator(status);
    }

    getPlatformFromCard(card) {
        const platformName = card.querySelector('.platform-name');
        if (!platformName) return null;
        
        const name = platformName.textContent.toLowerCase();
        if (name.includes('windows')) return 'windows';
        if (name.includes('macos') || name.includes('mac')) return 'macos';
        if (name.includes('linux')) return 'linux';
        return null;
    }

    updateStatusIndicator(status) {
        // Create or update build status indicator
        let indicator = document.getElementById('build-status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'build-status-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 10px;
                font-size: 0.8rem;
                z-index: 1000;
                display: none;
            `;
            document.body.appendChild(indicator);
        }

        const availableBuilds = Object.values(status.builds).filter(Boolean).length;
        const totalBuilds = Object.keys(status.builds).length;
        
        indicator.innerHTML = `
            🔧 Builds: ${availableBuilds}/${totalBuilds} ready<br>
            <small>Updated: ${new Date(status.buildTime).toLocaleTimeString()}</small>
        `;

        // Show briefly if there are updates
        if (availableBuilds > 0) {
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 5000);
        }
    }

    // Initialize automatic checking
    startAutoCheck() {
        this.updateDownloadButtons();
        setInterval(() => {
            this.updateDownloadButtons();
        }, this.checkInterval);
    }
}

// Initialize when page loads
if (typeof window !== 'undefined') {
    const buildChecker = new BuildStatusChecker();
    
    document.addEventListener('DOMContentLoaded', () => {
        buildChecker.startAutoCheck();
    });
    
    // Make it globally available
    window.buildStatusChecker = buildChecker;
}
