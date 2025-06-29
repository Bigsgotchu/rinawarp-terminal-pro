/**
 * RinaWarp Terminal - Recovery Ui
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
import { DataRecoveryEngine } from './recovery-engine.js';

export class DataRecoveryUI {
  constructor(container) {
    this.container = container;
    this.engine = new DataRecoveryEngine();
    this.currentScan = null;
    this.selectedFiles = new Set();

    this.setupEventListeners();
    this.createUI();
  }

  setupEventListeners() {
    this.engine.on('scanStarted', data => this.onScanStarted(data));
    this.engine.on('progress', progress => this.onProgress(progress));
    this.engine.on('fileFound', fileInfo => this.onFileFound(fileInfo));
    this.engine.on('scanCompleted', data => this.onScanCompleted(data));
    this.engine.on('scanError', error => this.onScanError(error));
    this.engine.on('fileRecovered', data => this.onFileRecovered(data));
  }

  createUI() {
    this.container.innerHTML = `
      <div class="data-recovery-app">
        <div class="recovery-header">
          <h1>🔄 UltData Recovery</h1>
          <p>Professional data recovery solution</p>
        </div>
        
        <div class="recovery-main">
          <div class="drive-selection">
            <h3>📱 Select Drive to Scan</h3>
            <div class="drive-list" id="driveList">
              <div class="loading">Loading drives...</div>
            </div>
            
            <div class="scan-options">
              <h4>Scan Type</h4>
              <div class="scan-type-options">
                <label>
                  <input type="radio" name="scanType" value="quick" checked>
                  <span class="option-label">🚀 Quick Scan</span>
                  <small>Scan recycle bin, temp files, recent deletions</small>
                </label>
                <label>
                  <input type="radio" name="scanType" value="deep">
                  <span class="option-label">🔍 Deep Scan</span>
                  <small>Full disk analysis with file carving</small>
                </label>
              </div>
              
              <h4>File Types</h4>
              <div class="file-type-filters">
                <label><input type="checkbox" value="images" checked> 🖼️ Images</label>
                <label><input type="checkbox" value="videos" checked> 🎥 Videos</label>
                <label><input type="checkbox" value="audio" checked> 🎵 Audio</label>
                <label><input type="checkbox" value="documents" checked> 📄 Documents</label>
                <label><input type="checkbox" value="archives" checked> 📦 Archives</label>
                <label><input type="checkbox" value="databases" checked> 🗄️ Databases</label>
                <label><input type="checkbox" value="other"> 📁 Other</label>
              </div>
            </div>
            
            <button id="startScanBtn" class="start-scan-btn">
              🔍 Start Scan
            </button>
          </div>
          
          <div class="scan-results">
            <div class="scan-status" id="scanStatus">
              <h3>Scan Status</h3>
              <div class="status-idle">
                <p>Ready to scan</p>
              </div>
            </div>
            
            <div class="progress-container" id="progressContainer" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
              </div>
              <div class="progress-text" id="progressText">0%</div>
              <button id="stopScanBtn" class="stop-scan-btn">⏹️ Stop</button>
            </div>
            
            <div class="file-results" id="fileResults" style="display: none;">
              <div class="results-header">
                <h3>Found Files</h3>
                <div class="results-actions">
                  <button id="selectAllBtn">✅ Select All</button>
                  <button id="selectNoneBtn">❌ Select None</button>
                  <button id="recoverSelectedBtn" disabled>💾 Recover Selected</button>
                </div>
              </div>
              
              <div class="file-filters">
                <select id="categoryFilter">
                  <option value="">All Categories</option>
                </select>
                <select id="recoveryChanceFilter">
                  <option value="0">All Files</option>
                  <option value="70">High Recovery Chance (70%+)</option>
                  <option value="50">Medium Recovery Chance (50%+)</option>
                  <option value="30">Low Recovery Chance (30%+)</option>
                </select>
                <input type="text" id="searchFilter" placeholder="Search files...">
              </div>
              
              <div class="file-list" id="fileList"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupUIEventListeners();
    this.loadDrives();
  }

  setupUIEventListeners() {
    // Start scan button
    document.getElementById('startScanBtn').addEventListener('click', () => {
      this.startScan();
    });

    // Stop scan button
    document.getElementById('stopScanBtn').addEventListener('click', () => {
      this.engine.stopScan();
    });

    // File selection buttons
    document.getElementById('selectAllBtn').addEventListener('click', () => {
      this.selectAllFiles();
    });

    document.getElementById('selectNoneBtn').addEventListener('click', () => {
      this.selectNoFiles();
    });

    // Recover selected button
    document.getElementById('recoverSelectedBtn').addEventListener('click', () => {
      this.recoverSelectedFiles();
    });

    // Filters
    document.getElementById('categoryFilter').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('recoveryChanceFilter').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('searchFilter').addEventListener('input', () => {
      this.applyFilters();
    });
  }

  async loadDrives() {
    try {
      const drives = await this.engine.getAvailableDrives();
      const driveList = document.getElementById('driveList');

      if (drives.length === 0) {
        driveList.innerHTML = '<div class="no-drives">No drives found</div>';
        return;
      }

      driveList.innerHTML = drives
        .map(drive => {
          const sizeGB = drive.totalSize
            ? Math.round(drive.totalSize / (1024 * 1024 * 1024))
            : 'Unknown';
          const freeGB = drive.freeSpace
            ? Math.round(drive.freeSpace / (1024 * 1024 * 1024))
            : 'Unknown';

          return `
          <div class="drive-item" data-drive="${drive.letter || drive.mountPoint}">
            <div class="drive-icon">💽</div>
            <div class="drive-info">
              <div class="drive-letter">${drive.letter || drive.device}</div>
              <div class="drive-details">
                ${drive.mountPoint ? `Mount: ${drive.mountPoint}` : ''}
                Size: ${sizeGB}GB | Free: ${freeGB}GB
              </div>
            </div>
            <input type="radio" name="selectedDrive" value="${drive.letter || drive.mountPoint}">
          </div>
        `;
        })
        .join('');

      // Select first drive by default
      const firstRadio = driveList.querySelector('input[type="radio"]');
      if (firstRadio) {
        firstRadio.checked = true;
      }
    } catch (error) {
      console.error('Error loading drives:', error);
      document.getElementById('driveList').innerHTML =
        '<div class="error">Error loading drives</div>';
    }
  }

  async startScan() {
    const selectedDrive = document.querySelector('input[name="selectedDrive"]:checked');
    const scanType = document.querySelector('input[name="scanType"]:checked');
    const fileTypes = Array.from(document.querySelectorAll('.file-type-filters input:checked')).map(
      cb => cb.value
    );

    if (!selectedDrive) {
      alert('Please select a drive to scan');
      return;
    }

    const drivePath = selectedDrive.value;
    const options = {
      fileTypes,
      includeAll: fileTypes.includes('other'),
    };

    // Start the scan
    if (scanType.value === 'quick') {
      this.currentScan = this.engine.quickScan(drivePath, options);
    } else {
      this.currentScan = this.engine.deepScan(drivePath, options);
    }
  }

  onScanStarted(data) {
    document.getElementById('scanStatus').innerHTML = `
      <h3>Scanning...</h3>
      <p>Performing ${data.type} scan on ${data.drive}</p>
    `;

    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('fileResults').style.display = 'none';
    document.getElementById('startScanBtn').disabled = true;
  }

  onProgress(progress) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');

    fill.style.width = progress + '%';
    text.textContent = Math.round(progress) + '%';
  }

  onFileFound(fileInfo) {
    // Optionally show real-time file discovery
    console.log('Found file:', fileInfo.name);
  }

  onScanCompleted(data) {
    document.getElementById('scanStatus').innerHTML = `
      <h3>Scan Complete</h3>
      <p>Found ${data.filesFound} recoverable files</p>
    `;

    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('startScanBtn').disabled = false;

    if (data.filesFound > 0) {
      this.displayResults(data.files);
    } else {
      document.getElementById('fileResults').innerHTML = `
        <div class="no-results">
          <h3>No Files Found</h3>
          <p>No recoverable files were found. Try a deep scan for better results.</p>
        </div>
      `;
      document.getElementById('fileResults').style.display = 'block';
    }
  }

  onScanError(error) {
    document.getElementById('scanStatus').innerHTML = `
      <h3>Scan Error</h3>
      <p class="error">${error.message}</p>
    `;

    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('startScanBtn').disabled = false;
  }

  displayResults(files) {
    // Populate category filter
    const categories = [...new Set(files.map(f => f.category))];
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML =
      '<option value="">All Categories</option>' +
      categories
        .map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`)
        .join('');

    this.allFiles = files;
    this.displayFileList(files);
    document.getElementById('fileResults').style.display = 'block';
  }

  displayFileList(files) {
    const fileList = document.getElementById('fileList');

    if (files.length === 0) {
      fileList.innerHTML = '<div class="no-files">No files match the current filters</div>';
      return;
    }

    fileList.innerHTML = files
      .map((file, index) => {
        const sizeStr = this.formatFileSize(file.size);
        const dateStr = file.dateModified.toLocaleDateString();
        const chanceColor =
          file.recoveryChance >= 70 ? 'high' : file.recoveryChance >= 50 ? 'medium' : 'low';

        return `
        <div class="file-item" data-index="${index}">
          <div class="file-checkbox">
            <input type="checkbox" id="file-${index}" data-file-index="${index}">
          </div>
          <div class="file-icon">${this.getFileIcon(file.category)}</div>
          <div class="file-info">
            <div class="file-name" title="${file.path}">${file.name}</div>
            <div class="file-details">
              ${sizeStr} • ${dateStr} • ${file.category}
              ${file.isCorrupted ? ' • ⚠️ May be corrupted' : ''}
              ${file.isRecycleBin ? ' • 🗑️ From Recycle Bin' : ''}
            </div>
          </div>
          <div class="recovery-chance ${chanceColor}">
            ${file.recoveryChance}%
          </div>
        </div>
      `;
      })
      .join('');

    // Add event listeners for checkboxes
    fileList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => this.updateSelectedFiles());
    });
  }

  getFileIcon(category) {
    const icons = {
      images: '🖼️',
      videos: '🎥',
      audio: '🎵',
      documents: '📄',
      archives: '📦',
      databases: '🗄️',
      other: '📁',
      unknown: '❓',
    };
    return icons[category] || icons.unknown;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  selectAllFiles() {
    const checkboxes = document.querySelectorAll('#fileList input[type="checkbox"]');
    checkboxes.forEach(cb => (cb.checked = true));
    this.updateSelectedFiles();
  }

  selectNoFiles() {
    const checkboxes = document.querySelectorAll('#fileList input[type="checkbox"]');
    checkboxes.forEach(cb => (cb.checked = false));
    this.updateSelectedFiles();
  }

  updateSelectedFiles() {
    const checkboxes = document.querySelectorAll('#fileList input[type="checkbox"]:checked');
    const recoverBtn = document.getElementById('recoverSelectedBtn');

    this.selectedFiles.clear();
    checkboxes.forEach(cb => {
      const index = parseInt(cb.dataset.fileIndex);
      this.selectedFiles.add(index);
    });

    recoverBtn.disabled = this.selectedFiles.size === 0;
    recoverBtn.textContent = `💾 Recover Selected (${this.selectedFiles.size})`;
  }

  applyFilters() {
    if (!this.allFiles) return;

    const categoryFilter = document.getElementById('categoryFilter').value;
    const chanceFilter = parseInt(document.getElementById('recoveryChanceFilter').value);
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

    const filtered = this.allFiles.filter(file => {
      // Category filter
      if (categoryFilter && file.category !== categoryFilter) return false;

      // Recovery chance filter
      if (file.recoveryChance < chanceFilter) return false;

      // Search filter
      if (searchFilter && !file.name.toLowerCase().includes(searchFilter)) return false;

      return true;
    });

    this.displayFileList(filtered);
  }

  async recoverSelectedFiles() {
    if (this.selectedFiles.size === 0) return;

    // Get output directory from user
    const outputDir = await this.selectOutputDirectory();
    if (!outputDir) return;

    const selectedFileInfos = Array.from(this.selectedFiles).map(index => this.allFiles[index]);

    // Show recovery progress
    this.showRecoveryProgress();

    try {
      const results = await this.engine.recoverFiles(selectedFileInfos, outputDir);
      this.showRecoveryResults(results);
    } catch (error) {
      alert('Recovery failed: ' + error.message);
    }
  }

  async selectOutputDirectory() {
    // In a real implementation, this would open a directory picker
    // For now, use a simple prompt
    return prompt('Enter output directory path:', process.env.USERPROFILE + '\\Recovered Files');
  }

  showRecoveryProgress() {
    // Show a recovery progress dialog
    const modal = document.createElement('div');
    modal.className = 'recovery-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Recovering Files...</h3>
        <div class="recovery-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="recoveryProgressFill"></div>
          </div>
          <div id="recoveryStatus">Preparing recovery...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  showRecoveryResults(results) {
    // Remove progress modal
    const modal = document.querySelector('.recovery-modal');
    if (modal) modal.remove();

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    alert(`Recovery completed!\n\nSuccessful: ${successful}\nFailed: ${failed}`);
  }

  onFileRecovered(data) {
    console.log('File recovered:', data.recovered);
  }
}
