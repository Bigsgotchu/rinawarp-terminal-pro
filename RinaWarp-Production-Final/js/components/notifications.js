/**
 * RinaWarp Terminal Creator Edition - Notification System
 * Comprehensive notification system with accessibility support
 */

/**
 * NotificationSystem class
 * Manages all user notifications and screen reader announcements
 */
export class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.notificationQueue = [];
    this.maxNotifications = 5;
    this.defaultDuration = 5000;
    this.container = null;

    this.types = {
      SUCCESS: 'success',
      ERROR: 'error',
      WARNING: 'warning',
      INFO: 'info',
    };

    // Bind methods
    this.show = this.show.bind(this);
    this.dismiss = this.dismiss.bind(this);
    this.clear = this.clear.bind(this);
  }

  /**
   * Initialize notification system
   */
  init() {
    this.createContainer();
    this.setupEventListeners();
    console.log('📢 Notification system initialized');
  }

  /**
   * Create notification container
   */
  createContainer() {
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Notifications');
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a notification
   */
  show(options) {
    const notification = this.createNotification(options);
    this.addNotification(notification);
    return notification.id;
  }

  /**
   * Create notification element
   */
  createNotification(options) {
    const id = this.generateId();
    const {
      title = 'Notification',
      message = '',
      type = this.types.INFO,
      duration = this.defaultDuration,
      actions = [],
      persistent = false,
      icon = null,
    } = options;

    const notification = {
      id,
      title,
      message,
      type,
      duration,
      actions,
      persistent,
      icon,
      timestamp: Date.now(),
      element: this.createElement(id, title, message, type, actions, icon),
    };

    return notification;
  }

  /**
   * Create notification DOM element
   */
  createElement(id, title, message, type, actions, icon) {
    const element = document.createElement('div');
    element.className = `notification notification-${type}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('data-notification-id', id);
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';

    const iconHtml = icon || this.getDefaultIcon(type);
    const actionsHtml = actions
      .map(
        action =>
          `<button class="notification-action" data-action="${action.key || 'default'}">
                ${action.label}
            </button>`
      )
      .join('');

    element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon" aria-hidden="true">${iconHtml}</div>
                <div class="notification-body">
                    <div class="notification-title">${this.escapeHtml(title)}</div>
                    <div class="notification-message">${this.escapeHtml(message)}</div>
                    ${actionsHtml ? `<div class="notification-actions">${actionsHtml}</div>` : ''}
                </div>
                <button class="notification-close" aria-label="Close notification" title="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="notification-progress" aria-hidden="true"></div>
        `;

    // Add event listeners
    this.setupNotificationEvents(element, id, actions);

    return element;
  }

  /**
   * Setup event listeners for notification
   */
  setupNotificationEvents(element, id, actions) {
    // Close button
    const closeBtn = element.querySelector('.notification-close');
    closeBtn.addEventListener('click', e => {
      e.preventDefault();
      this.dismiss(id);
    });

    // Action buttons
    const actionBtns = element.querySelectorAll('.notification-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const actionKey = btn.getAttribute('data-action');
        const action = actions.find(a => a.key === actionKey);
        if (action && action.action) {
          action.action();
        }
        this.dismiss(id);
      });
    });

    // Keyboard navigation
    element.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.dismiss(id);
      } else if (e.key === 'Enter' && e.target.classList.contains('notification-action')) {
        e.target.click();
      }
    });

    // Hover to pause auto-dismiss
    element.addEventListener('mouseenter', () => {
      this.pauseAutoDismiss(id);
    });

    element.addEventListener('mouseleave', () => {
      this.resumeAutoDismiss(id);
    });
  }

  /**
   * Add notification to display
   */
  addNotification(notification) {
    // Check notification limits
    if (this.notifications.size >= this.maxNotifications) {
      const oldestId = Array.from(this.notifications.keys())[0];
      this.dismiss(oldestId);
    }

    // Add to notifications map
    this.notifications.set(notification.id, notification);

    // Add to DOM
    this.container.appendChild(notification.element);

    // Animate in
    requestAnimationFrame(() => {
      notification.element.style.transform = 'translateX(0)';
      notification.element.style.opacity = '1';
    });

    // Setup auto-dismiss
    if (!notification.persistent && notification.duration > 0) {
      this.setupAutoDismiss(notification);
    }

    // Announce to screen readers
    this.announceNotification(notification);

    // Focus management for important notifications
    if (notification.type === this.types.ERROR) {
      this.focusNotification(notification);
    }

    return notification.id;
  }

  /**
   * Setup auto-dismiss timer
   */
  setupAutoDismiss(notification) {
    const timer = setTimeout(() => {
      this.dismiss(notification.id);
    }, notification.duration);

    notification.dismissTimer = timer;

    // Setup progress indicator
    this.setupProgressIndicator(notification);
  }

  /**
   * Setup progress indicator
   */
  setupProgressIndicator(notification) {
    const progressBar = notification.element.querySelector('.notification-progress');
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.transition = `width ${notification.duration}ms linear`;

      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }
  }

  /**
   * Pause auto-dismiss
   */
  pauseAutoDismiss(id) {
    const notification = this.notifications.get(id);
    if (notification && notification.dismissTimer) {
      clearTimeout(notification.dismissTimer);
      notification.paused = true;

      const progressBar = notification.element.querySelector('.notification-progress');
      if (progressBar) {
        const currentWidth = progressBar.getBoundingClientRect().width;
        const containerWidth = progressBar.parentElement.getBoundingClientRect().width;
        const percentage = (currentWidth / containerWidth) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.style.transition = 'none';
      }
    }
  }

  /**
   * Resume auto-dismiss
   */
  resumeAutoDismiss(id) {
    const notification = this.notifications.get(id);
    if (notification && notification.paused) {
      notification.paused = false;

      const progressBar = notification.element.querySelector('.notification-progress');
      if (progressBar) {
        const currentWidth = progressBar.getBoundingClientRect().width;
        const containerWidth = progressBar.parentElement.getBoundingClientRect().width;
        const remainingPercentage = (currentWidth / containerWidth) * 100;
        const remainingTime = (remainingPercentage / 100) * notification.duration;

        progressBar.style.transition = `width ${remainingTime}ms linear`;
        progressBar.style.width = '0%';

        notification.dismissTimer = setTimeout(() => {
          this.dismiss(id);
        }, remainingTime);
      }
    }
  }

  /**
   * Dismiss notification
   */
  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Clear timer
    if (notification.dismissTimer) {
      clearTimeout(notification.dismissTimer);
    }

    // Animate out
    notification.element.style.transform = 'translateX(100%)';
    notification.element.style.opacity = '0';

    // Remove after animation
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Clear all notifications
   */
  clear() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.dismiss(id));
  }

  /**
   * Clear notifications by type
   */
  clearByType(type) {
    const notifications = Array.from(this.notifications.values());
    notifications.filter(n => n.type === type).forEach(n => this.dismiss(n.id));
  }

  /**
   * Announce notification to screen readers
   */
  announceNotification(notification) {
    const message = `${notification.title}. ${notification.message}`;
    const priority = notification.type === this.types.ERROR ? 'assertive' : 'polite';

    // Use accessibility manager if available
    if (window.accessibility && window.accessibility.announceToScreenReader) {
      window.accessibility.announceToScreenReader(message, priority);
    } else {
      // Fallback: create temporary live region
      this.createLiveAnnouncement(message, priority);
    }
  }

  /**
   * Create temporary live region for announcement
   */
  createLiveAnnouncement(message, priority) {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.textContent = message;

    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    }, 1000);
  }

  /**
   * Focus notification for accessibility
   */
  focusNotification(notification) {
    const firstButton = notification.element.querySelector('button');
    if (firstButton) {
      firstButton.focus();
    } else {
      notification.element.setAttribute('tabindex', '-1');
      notification.element.focus();
    }
  }

  /**
   * Get default icon for notification type
   */
  getDefaultIcon(type) {
    const icons = {
      [this.types.SUCCESS]: '✅',
      [this.types.ERROR]: '❌',
      [this.types.WARNING]: '⚠️',
      [this.types.INFO]: 'ℹ️',
    };
    return icons[type] || icons[this.types.INFO];
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;

    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Ctrl/Cmd + Shift + N: Show all notifications
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.showNotificationHistory();
      }

      // Escape: Clear all notifications
      if (e.key === 'Escape' && e.target.closest('.notification')) {
        this.clear();
      }
    });

    // Handle focus management when notifications appear/disappear
    this.container.addEventListener('DOMNodeInserted', () => {
      this.updateAriaLive();
    });

    this.container.addEventListener('DOMNodeRemoved', () => {
      this.updateAriaLive();
    });
  }

  /**
   * Update aria-live region based on notification count
   */
  updateAriaLive() {
    const count = this.notifications.size;
    if (count > 0) {
      this.container.setAttribute('aria-live', 'polite');
    } else {
      this.container.setAttribute('aria-live', 'off');
    }
  }

  /**
   * Show notification history
   */
  showNotificationHistory() {
    const history = Array.from(this.notifications.values())
      .map(n => `${n.title}: ${n.message}`)
      .join('\n');

    if (history) {
      this.show({
        title: 'Recent Notifications',
        message: history,
        type: this.types.INFO,
        persistent: true,
      });
    } else {
      this.show({
        title: 'Notifications',
        message: 'No recent notifications',
        type: this.types.INFO,
        duration: 3000,
      });
    }
  }

  /**
   * Utility methods for common notification patterns
   */

  success(title, message, options = {}) {
    return this.show({
      title,
      message,
      type: this.types.SUCCESS,
      ...options,
    });
  }

  error(title, message, options = {}) {
    return this.show({
      title,
      message,
      type: this.types.ERROR,
      duration: 8000,
      ...options,
    });
  }

  warning(title, message, options = {}) {
    return this.show({
      title,
      message,
      type: this.types.WARNING,
      duration: 6000,
      ...options,
    });
  }

  info(title, message, options = {}) {
    return this.show({
      title,
      message,
      type: this.types.INFO,
      ...options,
    });
  }

  /**
   * Cleanup old notifications
   */
  cleanup() {
    const now = Date.now();
    const oldThreshold = 30000; // 30 seconds

    const oldNotifications = Array.from(this.notifications.values()).filter(
      n => now - n.timestamp > oldThreshold
    );

    oldNotifications.forEach(n => this.dismiss(n.id));
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      total: this.notifications.size,
      byType: {
        success: Array.from(this.notifications.values()).filter(n => n.type === this.types.SUCCESS)
          .length,
        error: Array.from(this.notifications.values()).filter(n => n.type === this.types.ERROR)
          .length,
        warning: Array.from(this.notifications.values()).filter(n => n.type === this.types.WARNING)
          .length,
        info: Array.from(this.notifications.values()).filter(n => n.type === this.types.INFO)
          .length,
      },
      oldest: Math.min(...Array.from(this.notifications.values()).map(n => n.timestamp)),
      newest: Math.max(...Array.from(this.notifications.values()).map(n => n.timestamp)),
    };
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    console.log('📢 Notification system cleaned up');
  }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem();
