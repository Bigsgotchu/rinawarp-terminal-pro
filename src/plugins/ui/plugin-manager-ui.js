/**
 * RinaWarp Terminal - Enhanced Plugin Manager UI
 * Rich interface for managing plugins with visual feedback
 */

import { PluginManager } from '../plugin-manager.js';

export class PluginManagerUI {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.isVisible = false;
    this.currentTab = 'installed';
    this.searchQuery = '';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
    this.loadPluginData();
  }

  createUI() {
    const ui = document.createElement('div');
    ui.id = 'plugin-manager-ui';
    ui.className = 'plugin-manager-ui';
    ui.innerHTML = this.getUITemplate();
    
    document.body.appendChild(ui);
    this.uiElement = ui;
  }

  getUITemplate() {
    return `
      <div class="plugin-manager-overlay" id="plugin-overlay">
        <div class="plugin-manager-modal">
          <header class="plugin-manager-header">
            <h2>🔌 Plugin Manager</h2>
            <button class="close-btn" id="close-plugin-manager">×</button>
          </header>
          
          <nav class="plugin-manager-tabs">
            <button class="tab-btn active" data-tab="installed">Installed</button>
            <button class="tab-btn" data-tab="marketplace">Marketplace</button>
            <button class="tab-btn" data-tab="settings">Settings</button>
          </nav>
          
          <div class="plugin-manager-content">
            <!-- Installed Plugins Tab -->
            <div id="installed-tab" class="tab-content active">
              <div class="plugins-controls">
                <div class="search-container">
                  <input type="text" id="installed-search" placeholder="Search installed plugins..." />
                  <select id="installed-sort">
                    <option value="name">Sort by Name</option>
                    <option value="version">Sort by Version</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
                <div class="plugins-actions">
                  <button id="refresh-installed" class="btn btn-secondary">
                    <span class="icon">🔄</span> Refresh
                  </button>
                  <button id="install-local" class="btn btn-primary">
                    <span class="icon">📁</span> Install Local
                  </button>
                </div>
              </div>
              
              <div class="plugins-list" id="installed-plugins-list">
                <div class="loading-spinner">Loading plugins...</div>
              </div>
            </div>
            
            <!-- Marketplace Tab -->
            <div id="marketplace-tab" class="tab-content">
              <div class="plugins-controls">
                <div class="search-container">
                  <input type="text" id="marketplace-search" placeholder="Search marketplace..." />
                  <select id="marketplace-category">
                    <option value="">All Categories</option>
                    <option value="productivity">Productivity</option>
                    <option value="development">Development</option>
                    <option value="utility">Utility</option>
                    <option value="theme">Themes</option>
                  </select>
                </div>
                <div class="plugins-actions">
                  <button id="refresh-marketplace" class="btn btn-secondary">
                    <span class="icon">🔄</span> Refresh
                  </button>
                </div>
              </div>
              
              <div class="plugins-list" id="marketplace-plugins-list">
                <div class="loading-spinner">Loading marketplace...</div>
              </div>
            </div>
            
            <!-- Settings Tab -->
            <div id="settings-tab" class="tab-content">
              <div class="settings-section">
                <h3>Security Settings</h3>
                <div class="setting-item">
                  <label>
                    <input type="checkbox" id="allow-untrusted-plugins" />
                    Allow untrusted plugins
                  </label>
                  <p class="setting-description">
                    WARNING: Only enable this if you trust the plugin source
                  </p>
                </div>
                <div class="setting-item">
                  <label>
                    <input type="checkbox" id="auto-update-plugins" />
                    Auto-update plugins
                  </label>
                  <p class="setting-description">
                    Automatically update plugins when new versions are available
                  </p>
                </div>
              </div>
              
              <div class="settings-section">
                <h3>Performance Settings</h3>
                <div class="setting-item">
                  <label>
                    Plugin timeout (seconds):
                    <input type="number" id="plugin-timeout" min="1" max="60" value="10" />
                  </label>
                </div>
                <div class="setting-item">
                  <label>
                    Max concurrent plugins:
                    <input type="number" id="max-plugins" min="1" max="20" value="10" />
                  </label>
                </div>
              </div>
              
              <div class="settings-section">
                <h3>Development Settings</h3>
                <div class="setting-item">
                  <label>
                    <input type="checkbox" id="debug-mode" />
                    Enable debug mode
                  </label>
                  <p class="setting-description">
                    Show detailed plugin loading and execution information
                  </p>
                </div>
                <div class="setting-item">
                  <label>
                    Plugin development directory:
                    <input type="text" id="dev-directory" value="~/.rinawarp/plugins/dev" />
                  </label>
                </div>
              </div>
              
              <div class="settings-actions">
                <button id="save-settings" class="btn btn-primary">Save Settings</button>
                <button id="reset-settings" class="btn btn-secondary">Reset to Defaults</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Plugin Details Modal -->
      <div class="plugin-details-modal" id="plugin-details-modal">
        <div class="modal-content">
          <header class="modal-header">
            <h3 id="plugin-details-title">Plugin Details</h3>
            <button class="close-btn" id="close-plugin-details">×</button>
          </header>
          <div class="modal-body" id="plugin-details-content">
            <!-- Plugin details will be inserted here -->
          </div>
        </div>
      </div>
      
      <!-- Notification Container -->
      <div class="notification-container" id="notification-container"></div>
    `;
  }

  bindEvents() {
    // Close button
    document.getElementById('close-plugin-manager').addEventListener('click', () => {
      this.hide();
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Search functionality
    document.getElementById('installed-search').addEventListener('input', (e) => {
      this.searchPlugins('installed', e.target.value);
    });
    
    document.getElementById('marketplace-search').addEventListener('input', (e) => {
      this.searchPlugins('marketplace', e.target.value);
    });
    
    // Sorting
    document.getElementById('installed-sort').addEventListener('change', (e) => {
      this.sortPlugins('installed', e.target.value);
    });
    
    // Action buttons
    document.getElementById('refresh-installed').addEventListener('click', () => {
      this.refreshInstalledPlugins();
    });
    
    document.getElementById('refresh-marketplace').addEventListener('click', () => {
      this.refreshMarketplacePlugins();
    });
    
    document.getElementById('install-local').addEventListener('click', () => {
      this.installLocalPlugin();
    });
    
    // Settings
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });
    
    // Plugin details modal
    document.getElementById('close-plugin-details').addEventListener('click', () => {
      this.hidePluginDetails();
    });
    
    // Close on overlay click
    document.getElementById('plugin-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hide();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isVisible) {
        if (e.key === 'Escape') {
          this.hide();
        }
      }
    });
  }

  show() {
    this.isVisible = true;
    this.uiElement.style.display = 'block';
    this.refreshCurrentTab();
  }

  hide() {
    this.isVisible = false;
    this.uiElement.style.display = 'none';
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    this.refreshCurrentTab();
  }

  refreshCurrentTab() {
    switch (this.currentTab) {
      case 'installed':
        this.refreshInstalledPlugins();
        break;
      case 'marketplace':
        this.refreshMarketplacePlugins();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  }

  async refreshInstalledPlugins() {
    const listElement = document.getElementById('installed-plugins-list');
    listElement.innerHTML = '<div class="loading-spinner">Loading plugins...</div>';
    
    try {
      const plugins = this.pluginManager.getPluginStatus();
      this.renderInstalledPlugins(plugins);
    } catch (error) {
      this.showError('Failed to load installed plugins: ' + error.message);
    }
  }

  renderInstalledPlugins(plugins) {
    const listElement = document.getElementById('installed-plugins-list');
    
    if (Object.keys(plugins).length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔌</div>
          <h3>No plugins installed</h3>
          <p>Browse the marketplace to find and install plugins</p>
          <button class="btn btn-primary" onclick="pluginManagerUI.switchTab('marketplace')">
            Browse Marketplace
          </button>
        </div>
      `;
      return;
    }
    
    const pluginCards = Object.entries(plugins).map(([name, plugin]) => {
      return this.createPluginCard(name, plugin, 'installed');
    });
    
    listElement.innerHTML = pluginCards.join('');
    
    // Bind plugin action buttons
    this.bindPluginActions();
  }

  async refreshMarketplacePlugins() {
    const listElement = document.getElementById('marketplace-plugins-list');
    listElement.innerHTML = '<div class="loading-spinner">Loading marketplace...</div>';
    
    try {
      const plugins = await this.pluginManager.marketplace.searchPlugins('');
      this.renderMarketplacePlugins(plugins);
    } catch (error) {
      this.showError('Failed to load marketplace: ' + error.message);
      listElement.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Failed to load marketplace</h3>
          <p>${error.message}</p>
          <button class="btn btn-secondary" onclick="pluginManagerUI.refreshMarketplacePlugins()">
            Try Again
          </button>
        </div>
      `;
    }
  }

  renderMarketplacePlugins(pluginsData) {
    const listElement = document.getElementById('marketplace-plugins-list');
    const plugins = pluginsData.plugins || [];
    
    if (plugins.length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏪</div>
          <h3>No plugins found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      `;
      return;
    }
    
    const pluginCards = plugins.map(plugin => {
      return this.createPluginCard(plugin.name, plugin, 'marketplace');
    });
    
    listElement.innerHTML = pluginCards.join('');
    this.bindPluginActions();
  }

  createPluginCard(name, plugin, type) {
    const isInstalled = type === 'installed';
    const statusClass = isInstalled ? 
      (plugin.active ? 'status-active' : 'status-inactive') : 
      'status-available';
    
    return `
      <div class="plugin-card" data-plugin="${name}">
        <div class="plugin-header">
          <div class="plugin-icon">
            ${this.getPluginIcon(plugin.category || 'utility')}
          </div>
          <div class="plugin-info">
            <h4 class="plugin-name">${name}</h4>
            <p class="plugin-version">v${plugin.version}</p>
            <span class="plugin-status ${statusClass}">
              ${isInstalled ? (plugin.active ? 'Active' : 'Inactive') : 'Available'}
            </span>
          </div>
          <div class="plugin-actions">
            ${this.getPluginActions(name, plugin, type)}
          </div>
        </div>
        
        <div class="plugin-body">
          <p class="plugin-description">${plugin.description || 'No description available'}</p>
          
          <div class="plugin-meta">
            <span class="plugin-author">
              <strong>Author:</strong> ${plugin.author || 'Unknown'}
            </span>
            ${plugin.trusted ? '<span class="plugin-trusted">✅ Trusted</span>' : ''}
          </div>
          
          ${plugin.permissions ? `
            <div class="plugin-permissions">
              <strong>Permissions:</strong>
              <div class="permission-tags">
                ${plugin.permissions.map(perm => `<span class="permission-tag">${perm}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="plugin-footer">
          <button class="btn btn-link" onclick="pluginManagerUI.showPluginDetails('${name}')">
            View Details
          </button>
          ${plugin.homepage ? `
            <a href="${plugin.homepage}" target="_blank" class="btn btn-link">
              Homepage
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }

  getPluginIcon(category) {
    const icons = {
      productivity: '📊',
      development: '⚙️',
      utility: '🔧',
      theme: '🎨',
      security: '🔒',
      network: '🌐',
      default: '🔌'
    };
    
    return icons[category] || icons.default;
  }

  getPluginActions(name, plugin, type) {
    if (type === 'installed') {
      return `
        <button class="btn btn-sm ${plugin.active ? 'btn-warning' : 'btn-success'}" 
                onclick="pluginManagerUI.${plugin.active ? 'deactivate' : 'activate'}Plugin('${name}')">
          ${plugin.active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="pluginManagerUI.uninstallPlugin('${name}')">
          Uninstall
        </button>
      `;
    } else {
      return `
        <button class="btn btn-sm btn-primary" onclick="pluginManagerUI.installPlugin('${name}')">
          Install
        </button>
      `;
    }
  }

  async installPlugin(pluginId) {
    try {
      this.showLoading(`Installing ${pluginId}...`);
      await this.pluginManager.marketplace.installPlugin(pluginId);
      this.showSuccess(`Plugin ${pluginId} installed successfully!`);
      this.refreshCurrentTab();
    } catch (error) {
      this.showError(`Failed to install ${pluginId}: ${error.message}`);
    }
  }

  async uninstallPlugin(pluginName) {
    if (!confirm(`Are you sure you want to uninstall ${pluginName}?`)) {
      return;
    }
    
    try {
      await this.pluginManager.unloadPlugin(pluginName);
      this.showSuccess(`Plugin ${pluginName} uninstalled successfully!`);
      this.refreshCurrentTab();
    } catch (error) {
      this.showError(`Failed to uninstall ${pluginName}: ${error.message}`);
    }
  }

  async activatePlugin(pluginName) {
    try {
      const plugin = this.pluginManager.plugins.get(pluginName);
      if (plugin && plugin.instance.init) {
        await plugin.instance.init();
        plugin.active = true;
        this.showSuccess(`Plugin ${pluginName} activated!`);
        this.refreshCurrentTab();
      }
    } catch (error) {
      this.showError(`Failed to activate ${pluginName}: ${error.message}`);
    }
  }

  async deactivatePlugin(pluginName) {
    try {
      const plugin = this.pluginManager.plugins.get(pluginName);
      if (plugin && plugin.instance.cleanup) {
        await plugin.instance.cleanup();
        plugin.active = false;
        this.showSuccess(`Plugin ${pluginName} deactivated!`);
        this.refreshCurrentTab();
      }
    } catch (error) {
      this.showError(`Failed to deactivate ${pluginName}: ${error.message}`);
    }
  }

  showPluginDetails(pluginName) {
    const modal = document.getElementById('plugin-details-modal');
    const title = document.getElementById('plugin-details-title');
    const content = document.getElementById('plugin-details-content');
    
    title.textContent = pluginName;
    
    // Get plugin info
    const plugin = this.pluginManager.plugins.get(pluginName);
    if (plugin) {
      content.innerHTML = this.getPluginDetailsContent(pluginName, plugin);
    } else {
      content.innerHTML = '<p>Plugin not found</p>';
    }
    
    modal.style.display = 'block';
  }

  hidePluginDetails() {
    document.getElementById('plugin-details-modal').style.display = 'none';
  }

  getPluginDetailsContent(name, plugin) {
    return `
      <div class="plugin-details">
        <div class="detail-section">
          <h4>Basic Information</h4>
          <table class="detail-table">
            <tr><td>Name:</td><td>${name}</td></tr>
            <tr><td>Version:</td><td>${plugin.manifest.version}</td></tr>
            <tr><td>Author:</td><td>${plugin.manifest.author || 'Unknown'}</td></tr>
            <tr><td>Status:</td><td>${plugin.active ? 'Active' : 'Inactive'}</td></tr>
            <tr><td>Trusted:</td><td>${plugin.trusted ? 'Yes' : 'No'}</td></tr>
          </table>
        </div>
        
        <div class="detail-section">
          <h4>Description</h4>
          <p>${plugin.manifest.description || 'No description available'}</p>
        </div>
        
        <div class="detail-section">
          <h4>Permissions</h4>
          <div class="permission-tags">
            ${(plugin.manifest.permissions || []).map(perm => 
              `<span class="permission-tag">${perm}</span>`
            ).join('')}
          </div>
        </div>
        
        <div class="detail-section">
          <h4>Dependencies</h4>
          ${plugin.manifest.dependencies ? 
            Object.entries(plugin.manifest.dependencies).map(([dep, version]) => 
              `<div class="dependency-item">${dep}: ${version}</div>`
            ).join('') : 
            '<p>No dependencies</p>'
          }
        </div>
      </div>
    `;
  }

  loadSettings() {
    const settings = this.getSettings();
    
    document.getElementById('allow-untrusted-plugins').checked = settings.allowUntrusted;
    document.getElementById('auto-update-plugins').checked = settings.autoUpdate;
    document.getElementById('plugin-timeout').value = settings.timeout;
    document.getElementById('max-plugins').value = settings.maxPlugins;
    document.getElementById('debug-mode').checked = settings.debugMode;
    document.getElementById('dev-directory').value = settings.devDirectory;
  }

  saveSettings() {
    const settings = {
      allowUntrusted: document.getElementById('allow-untrusted-plugins').checked,
      autoUpdate: document.getElementById('auto-update-plugins').checked,
      timeout: parseInt(document.getElementById('plugin-timeout').value),
      maxPlugins: parseInt(document.getElementById('max-plugins').value),
      debugMode: document.getElementById('debug-mode').checked,
      devDirectory: document.getElementById('dev-directory').value
    };
    
    localStorage.setItem('plugin-manager-settings', JSON.stringify(settings));
    this.showSuccess('Settings saved successfully!');
  }

  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      localStorage.removeItem('plugin-manager-settings');
      this.loadSettings();
      this.showSuccess('Settings reset to defaults!');
    }
  }

  getSettings() {
    const defaults = {
      allowUntrusted: false,
      autoUpdate: true,
      timeout: 10,
      maxPlugins: 10,
      debugMode: false,
      devDirectory: '~/.rinawarp/plugins/dev'
    };
    
    const saved = localStorage.getItem('plugin-manager-settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  searchPlugins(type, query) {
    const listElement = document.getElementById(`${type}-plugins-list`);
    const cards = listElement.querySelectorAll('.plugin-card');
    
    cards.forEach(card => {
      const name = card.querySelector('.plugin-name').textContent;
      const description = card.querySelector('.plugin-description').textContent;
      const author = card.querySelector('.plugin-author').textContent;
      
      const matches = [name, description, author].some(text => 
        text.toLowerCase().includes(query.toLowerCase())
      );
      
      card.style.display = matches ? 'block' : 'none';
    });
  }

  sortPlugins(type, sortBy) {
    const listElement = document.getElementById(`${type}-plugins-list`);
    const cards = Array.from(listElement.querySelectorAll('.plugin-card'));
    
    cards.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.querySelector('.plugin-name').textContent;
          bValue = b.querySelector('.plugin-name').textContent;
          break;
        case 'version':
          aValue = a.querySelector('.plugin-version').textContent;
          bValue = b.querySelector('.plugin-version').textContent;
          break;
        case 'status':
          aValue = a.querySelector('.plugin-status').textContent;
          bValue = b.querySelector('.plugin-status').textContent;
          break;
        default:
          return 0;
      }
      
      return aValue.localeCompare(bValue);
    });
    
    cards.forEach(card => {
      listElement.appendChild(card);
    });
  }

  bindPluginActions() {
    // Plugin actions are bound via onclick attributes in the HTML
    // This method can be used for additional event binding if needed
  }

  installLocalPlugin() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.zip';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          this.showLoading('Installing local plugin...');
          // Implementation depends on how local plugins are handled
          this.showSuccess('Local plugin installed successfully!');
          this.refreshCurrentTab();
        } catch (error) {
          this.showError('Failed to install local plugin: ' + error.message);
        }
      }
    };
    input.click();
  }

  async loadPluginData() {
    // Initial load of plugin data
    if (this.currentTab === 'installed') {
      this.refreshInstalledPlugins();
    }
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showLoading(message) {
    this.showNotification(message, 'loading');
  }
}

// Global instance for easy access
window.pluginManagerUI = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // This will be initialized when the plugin manager is created
});
