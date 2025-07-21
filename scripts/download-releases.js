#!/usr/bin/env node

/**
 * Download Release Artifacts from GitHub Actions
 * Downloads built artifacts from GitHub Actions and organizes them for website deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ArtifactDownloader {
    constructor() {
        this.releasesDir = path.join(__dirname, '..', 'releases');
        this.repoOwner = 'Rinawarp-Terminal'; // Update this to match your GitHub username/org
        this.repoName = 'rinawarp-terminal';
        
        console.log('🚀 RinaWarp Terminal Artifact Downloader');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.releasesDir)) {
            fs.mkdirSync(this.releasesDir, { recursive: true });
        }
    }

    async downloadLatestArtifacts() {
        console.log('📥 Downloading latest build artifacts from GitHub Actions...\n');
        
        try {
            // Check if GitHub CLI is installed
            execSync('gh --version', { stdio: 'ignore' });
            
            // Download artifacts from the latest successful workflow run
            const commands = [
                // Download Windows artifacts
                `gh run download --repo ${this.repoOwner}/${this.repoName} --pattern "windows-*" --dir ${this.releasesDir}`,
                
                // Download Linux artifacts  
                `gh run download --repo ${this.repoOwner}/${this.repoName} --pattern "linux-*" --dir ${this.releasesDir}`,
                
                // Download macOS artifacts
                `gh run download --repo ${this.repoOwner}/${this.repoName} --pattern "macos-*" --dir ${this.releasesDir}`
            ];

            for (const command of commands) {
                try {
                    console.log(`Running: ${command}`);
                    execSync(command, { stdio: 'inherit' });
                } catch (error) {
                    console.warn(`⚠️ Failed to download some artifacts: ${error.message}`);
                }
            }

            // Organize the downloaded files
            await this.organizeArtifacts();
            
            console.log('\n✅ Artifact download completed!');
            this.printSummary();
            
        } catch (error) {
            console.error('❌ GitHub CLI not found or not authenticated.');
            console.log('\n📋 Setup Instructions:');
            console.log('1. Install GitHub CLI: https://cli.github.com/');
            console.log('2. Authenticate: gh auth login');
            console.log('3. Run this script again');
            process.exit(1);
        }
    }

    async organizeArtifacts() {
        console.log('\n📁 Organizing artifacts...');
        
        const artifactDirs = fs.readdirSync(this.releasesDir).filter(item => {
            return fs.statSync(path.join(this.releasesDir, item)).isDirectory();
        });

        for (const dir of artifactDirs) {
            const dirPath = path.join(this.releasesDir, dir);
            const files = fs.readdirSync(dirPath);
            
            for (const file of files) {
                const srcPath = path.join(dirPath, file);
                const destPath = path.join(this.releasesDir, this.renameFile(file, dir));
                
                console.log(`Moving: ${file} -> ${path.basename(destPath)}`);
                fs.renameSync(srcPath, destPath);
            }
            
            // Remove empty directory
            fs.rmSync(dirPath, { recursive: true });
        }
    }

    renameFile(filename, artifactType) {
        // Rename files to match website expectations
        if (artifactType.includes('windows')) {
            if (filename.includes('Setup') || filename.endsWith('.exe')) {
                return 'RinaWarp-Terminal-Setup-Windows.exe';
            }
            if (filename.endsWith('.zip')) {
                return 'RinaWarp-Terminal-Windows-Portable.zip';
            }
        }
        
        if (artifactType.includes('linux')) {
            if (filename.endsWith('.AppImage')) {
                return 'RinaWarp-Terminal-Linux.AppImage';
            }
            if (filename.endsWith('.tar.gz')) {
                return 'RinaWarp-Terminal-Linux.tar.gz';
            }
        }
        
        if (artifactType.includes('macos') && filename.endsWith('.dmg')) {
            return 'RinaWarp-Terminal-macOS.dmg';
        }
        
        return filename; // Keep original name if no match
    }

    printSummary() {
        console.log('\n🎉 DOWNLOAD SUMMARY');
        console.log('==================');
        
        const files = fs.readdirSync(this.releasesDir).filter(file => {
            return fs.statSync(path.join(this.releasesDir, file)).isFile() &&
                   !file.endsWith('.txt') && !file.endsWith('.json');
        });

        files.forEach(file => {
            const filePath = path.join(this.releasesDir, file);
            const size = fs.statSync(filePath).size;
            console.log(`📦 ${file} (${this.formatBytes(size)})`);
        });
        
        console.log(`\n📁 All files ready in: ${this.releasesDir}`);
    }

    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Main execution
async function main() {
    const downloader = new ArtifactDownloader();
    await downloader.downloadLatestArtifacts();
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default ArtifactDownloader;
