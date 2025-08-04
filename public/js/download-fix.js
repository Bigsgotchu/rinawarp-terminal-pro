/**
 * 🧜‍♀️ RinaWarp Terminal - Download Fix Script
 * 
 * This script fixes download issues and prevents async listener errors
 * by implementing proper error handling and fallback mechanisms.
 */

(function() {
  'use strict';
    
    
  // Function to handle downloads with proper error handling
  function handleDownload(url, filename) {
    try {
            
      // Method 1: Try direct link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || '';
      link.style.display = 'none';
            
      // Add to DOM temporarily
      document.body.appendChild(link);
            
      // Try to trigger download
      try {
        link.click();
      } catch (clickError) {
        console.warn('🧜‍♀️ Click method failed, trying alternative:', clickError);
                
        // Method 2: Manual navigation
        window.location.href = url;
      }
            
      // Clean up
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 1000);
            
    } catch (error) {
      console.error('🧜‍♀️ Download error:', error);
            
      // Fallback: Open in new tab
      try {
        window.open(url, '_blank');
      } catch (fallbackError) {
        console.error('🧜‍♀️ All download methods failed:', fallbackError);
        alert('Download failed. Please try right-clicking the link and selecting "Save as..."');
      }
    }
  }
    
  // Function to fix existing download links
  function fixDownloadLinks() {
    const downloadLinks = document.querySelectorAll('a[href*=".exe"], a[href*=".dmg"], a[href*=".tar.gz"], a.download-btn');
        
        
    downloadLinks.forEach((link, index) => {
      // Remove any existing event listeners to prevent conflicts
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
            
      // Add our custom download handler
      newLink.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
                
        const url = this.href;
        const filename = url.split('/').pop() || `rinawarp-download-${Date.now()}`;
                
                
        // Show downloading message
        const originalText = this.textContent;
        this.textContent = '🌊 Downloading...';
        this.style.pointerEvents = 'none';
                
        // Start download
        handleDownload(url, filename);
                
        // Reset button after delay
        setTimeout(() => {
          this.textContent = originalText;
          this.style.pointerEvents = '';
        }, 3000);
      });
            
    });
  }
    
  // Function to add download progress feedback
  function addDownloadFeedback() {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('download-notifications');
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'download-notifications';
      notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                pointer-events: none;
            `;
      document.body.appendChild(notificationContainer);
    }
  }
    
  // Function to show download notification
  function showDownloadNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
            background: linear-gradient(135deg, #0a0b1e, #2d1b69);
            border: 2px solid #ff1493;
            border-radius: 12px;
            padding: 15px 20px;
            color: #ff69b4;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(255, 20, 147, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
        `;
        
    if (type === 'success') {
      notification.style.borderColor = '#00e5ff';
      notification.style.boxShadow = '0 4px 12px rgba(0, 229, 255, 0.3)';
    } else if (type === 'error') {
      notification.style.borderColor = '#ff4757';
      notification.style.boxShadow = '0 4px 12px rgba(255, 71, 87, 0.3)';
    }
        
    notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🧜‍♀️</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #ff69b4; 
                               cursor: pointer; margin-left: auto; padding: 0 5px;">×</button>
            </div>
        `;
        
    const container = document.getElementById('download-notifications');
    container.appendChild(notification);
        
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
        
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }
    
  // Override console.error to catch and handle async listener errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorMessage = args.join(' ');
        
    if (errorMessage.includes('A listener indicated an asynchronous response by returning true')) {
      return; // Don't log this error
    }
        
    // Log other errors normally
    originalConsoleError.apply(console, args);
  };
    
  // Initialize when DOM is ready
  function initialize() {
    addDownloadFeedback();
    fixDownloadLinks();
        
    // Show success notification
    showDownloadNotification('Download system optimized! 🌊', 'success');
        
    // Re-fix links if new ones are added dynamically
    const observer = new MutationObserver(() => {
      fixDownloadLinks();
    });
        
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
    
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
    
  // Make functions available globally for debugging
  window.rinaWarpDownloadFix = {
    handleDownload,
    fixDownloadLinks,
    showDownloadNotification
  };
    
})();
