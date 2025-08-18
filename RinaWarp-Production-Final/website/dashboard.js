// Dashboard JavaScript Functionality

// Configuration for dashboard
const DASHBOARD_CONFIG = {
  apiBaseUrl: 'https://api.rinawarptech.com',
  stripePortalUrl: 'https://billing.stripe.com/p/login/',
  downloadUrls: {
    free: {
      mac: '/download/free/RinaWarp-Terminal-3.0.0.dmg',
      windows: '/download/free/RinaWarp-Terminal-Setup-3.0.0.exe',
      linux: '/download/free/RinaWarp-Terminal-3.0.0.AppImage',
    },
    pro: {
      mac: '/download/pro/RinaWarp-Terminal-Pro-3.0.0.dmg',
      windows: '/download/pro/RinaWarp-Terminal-Pro-Setup-3.0.0.exe',
      linux: '/download/pro/RinaWarp-Terminal-Pro-3.0.0.AppImage',
    },
    team: {
      mac: '/download/team/RinaWarp-Terminal-Team-3.0.0.dmg',
      windows: '/download/team/RinaWarp-Terminal-Team-Setup-3.0.0.exe',
      linux: '/download/team/RinaWarp-Terminal-Team-3.0.0.AppImage',
    },
  },
};

// Global dashboard state
let currentUser = null;
let currentLicense = null;
let downloadHistory = [];
let billingHistory = [];

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function () {
  initializeDashboard();
});

// Initialize dashboard
async function initializeDashboard() {
  try {
    showLoadingModal('Loading dashboard...');

    // Check if user is logged in
    const license = getCurrentLicense();
    if (!license) {
      redirectToLogin();
      return;
    }

    currentLicense = license;

    // Load user data
    await loadUserData();

    // Update UI with user data
    updateDashboardUI();

    hideModal();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showError('Failed to load dashboard. Please try refreshing.');
  }
}

// Get current license from localStorage
function getCurrentLicense() {
  const stored = localStorage.getItem('rinawarp_license');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored license:', error);
      localStorage.removeItem('rinawarp_license');
    }
  }
  return null;
}

// Load user data from API
async function loadUserData() {
  if (!currentLicense) return;

  try {
    // Validate license with backend
    const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/api/validate-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseId: currentLicense.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to validate license');
    }

    const data = await response.json();

    if (!data.valid) {
      throw new Error(data.reason || 'License is no longer valid');
    }

    // Update license with latest data
    currentLicense = data.license;
    localStorage.setItem('rinawarp_license', JSON.stringify(currentLicense));

    // Load additional data
    await loadDownloadHistory();
    await loadBillingHistory();
  } catch (error) {
    console.error('Failed to load user data:', error);
    throw error;
  }
}

// Load download history
async function loadDownloadHistory() {
  // For now, use mock data - replace with actual API call
  downloadHistory = [
    {
      platform: 'macOS',
      filename: 'RinaWarp Terminal-3.0.0.dmg',
      size: '106 MB',
      downloadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      platform: 'Windows',
      filename: 'RinaWarp Terminal Setup 3.0.0.exe',
      size: '83 MB',
      downloadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// Load billing history
async function loadBillingHistory() {
  // For now, use mock data - replace with actual API call
  billingHistory = [
    {
      date: '2025-01-15',
      amount: 9.99,
      status: 'paid',
      invoiceUrl: '#',
    },
    {
      date: '2024-12-15',
      amount: 9.99,
      status: 'paid',
      invoiceUrl: '#',
    },
  ];
}

// Update dashboard UI with loaded data
function updateDashboardUI() {
  updateOverviewSection();
  updateLicenseSection();
  updateBillingSection();
  updateDownloadHistory();
  updatePlanFeatures();
}

// Update overview section
function updateOverviewSection() {
  if (!currentLicense) return;

  // Update plan name
  const planElements = document.querySelectorAll('#current-plan');
  planElements.forEach(el => {
    el.textContent = `${currentLicense.tier.charAt(0).toUpperCase() + currentLicense.tier.slice(1)} Plan`;
  });

  // Update plan status
  const statusElement = document.getElementById('plan-status');
  if (statusElement) {
    statusElement.textContent =
      currentLicense.status.charAt(0).toUpperCase() + currentLicense.status.slice(1);
    statusElement.className = `plan-status status-badge ${currentLicense.status}`;
  }

  // Update billing date
  const billingElement = document.getElementById('next-billing');
  if (billingElement && currentLicense.expires) {
    const expiryDate = new Date(currentLicense.expires);
    billingElement.textContent = expiryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Update billing amount
  const amountElement = document.getElementById('billing-amount');
  if (amountElement) {
    const amounts = { free: '$0', pro: '$9.99/month', team: '$29.99/month' };
    amountElement.textContent = amounts[currentLicense.tier] || 'N/A';
  }

  // Update license status
  const licenseStatusElement = document.getElementById('license-status');
  if (licenseStatusElement) {
    const now = new Date();
    const expiry = new Date(currentLicense.expires);
    const isValid = now < expiry && currentLicense.status === 'active';

    licenseStatusElement.textContent = isValid ? 'Valid' : 'Expired';
    licenseStatusElement.className = `license-status ${isValid ? 'valid' : 'expired'}`;
  }

  // Update license expiry
  const expiryElement = document.getElementById('license-expires');
  if (expiryElement && currentLicense.expires) {
    const expiryDate = new Date(currentLicense.expires);
    expiryElement.textContent = `Expires: ${expiryDate.toLocaleDateString()}`;
  }
}

// Update license section
function updateLicenseSection() {
  if (!currentLicense) return;

  // Update license plan
  const planElement = document.getElementById('license-plan');
  if (planElement) {
    planElement.textContent = `${currentLicense.tier.charAt(0).toUpperCase() + currentLicense.tier.slice(1)} Plan`;
  }

  // Update license email
  const emailElement = document.getElementById('license-email');
  if (emailElement) {
    emailElement.textContent = currentLicense.email || 'N/A';
  }

  // Update license ID
  const idElement = document.getElementById('license-id');
  if (idElement) {
    idElement.textContent = currentLicense.id;
  }

  // Update license created date
  const createdElement = document.getElementById('license-created');
  if (createdElement && currentLicense.createdAt) {
    const createdDate = new Date(currentLicense.createdAt);
    createdElement.textContent = createdDate.toLocaleDateString();
  }

  // Update license expiry
  const expiryElement = document.getElementById('license-expiry');
  if (expiryElement && currentLicense.expires) {
    const expiryDate = new Date(currentLicense.expires);
    expiryElement.textContent = expiryDate.toLocaleDateString();
  }

  // Update license status
  const statusElement = document.getElementById('license-current-status');
  if (statusElement) {
    statusElement.textContent =
      currentLicense.status.charAt(0).toUpperCase() + currentLicense.status.slice(1);
  }

  // Update license badge
  const badgeElement = document.getElementById('license-badge');
  if (badgeElement) {
    const isActive = currentLicense.status === 'active';
    badgeElement.className = `license-status-badge ${currentLicense.status}`;
    badgeElement.innerHTML = `
            <i class=\"fas ${isActive ? 'fa-check-circle' : 'fa-exclamation-circle'}\"></i>
            ${currentLicense.status.charAt(0).toUpperCase() + currentLicense.status.slice(1)}
        `;
  }
}

// Update billing section
function updateBillingSection() {
  if (!currentLicense) return;

  // Update subscription plan
  const planElement = document.getElementById('subscription-plan');
  if (planElement) {
    planElement.textContent = `${currentLicense.tier.charAt(0).toUpperCase() + currentLicense.tier.slice(1)} Plan`;
  }

  // Update subscription amount
  const amountElement = document.getElementById('subscription-amount');
  if (amountElement) {
    const amounts = { free: '$0/forever', pro: '$9.99/month', team: '$29.99/month' };
    amountElement.textContent = amounts[currentLicense.tier] || 'N/A';
  }

  // Update next billing date
  const billingElement = document.getElementById('subscription-next-billing');
  if (billingElement && currentLicense.expires) {
    const expiryDate = new Date(currentLicense.expires);
    billingElement.textContent = expiryDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

// Update download history
function updateDownloadHistory() {
  const historyContainer = document.getElementById('download-history');
  if (!historyContainer || !downloadHistory.length) {
    if (historyContainer) {
      historyContainer.innerHTML = '<p class=\"text-muted\">No downloads yet</p>';
    }
    return;
  }

  const historyHTML = downloadHistory
    .map(download => {
      const downloadDate = new Date(download.downloadedAt);
      const timeAgo = getTimeAgo(downloadDate);

      return `
            <div class=\"history-item\">
                <div class=\"history-info\">
                    <h4>${download.filename}</h4>
                    <small>${download.platform} • ${download.size}</small>
                </div>
                <div class=\"history-meta\">
                    ${timeAgo}
                </div>
            </div>
        `;
    })
    .join('');

  historyContainer.innerHTML = historyHTML;
}

// Update plan features
function updatePlanFeatures() {
  const featuresContainer = document.getElementById('plan-features');
  if (!featuresContainer || !currentLicense) return;

  const features = {
    free: [
      'FREE Groq AI integration',
      '50 AI requests/day',
      'Basic terminal features',
      '3 custom themes',
      'Community support',
    ],
    pro: [
      'Unlimited AI requests',
      'All AI models (Llama 3.3, Claude, GPT)',
      'Advanced terminal features',
      'Unlimited custom themes',
      'Cloud sync & backup',
      'Priority support',
    ],
    team: [
      'Everything in Pro',
      'Team collaboration tools',
      'Shared configurations',
      'Advanced analytics',
      'SSO integration',
      'Dedicated support',
    ],
  };

  const planFeatures = features[currentLicense.tier] || [];

  const featuresHTML = planFeatures
    .map(
      feature => `
        <div class=\"feature-item\">
            <i class=\"fas fa-check\"></i>
            <span>${feature}</span>
        </div>
    `
    )
    .join('');

  featuresContainer.innerHTML = featuresHTML;
}

// Navigation functions
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from all menu items
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Show selected section
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Add active class to clicked menu item
  const menuItem = document.querySelector(`[onclick=\"showSection('${sectionName}')\"]`);
  if (menuItem) {
    menuItem.classList.add('active');
  }

  // Track section view
  trackEvent('dashboard_section_view', { section: sectionName });
}

// Download functions
async function downloadPlatform(platform) {
  if (!currentLicense) {
    showError('No valid license found');
    return;
  }

  try {
    showLoadingModal('Generating download link...');

    let downloadUrl;

    if (currentLicense.tier === 'free') {
      // Direct download for free tier
      downloadUrl = DASHBOARD_CONFIG.downloadUrls.free[platform];
    } else {
      // Generate secure download link for paid tiers
      const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/api/generate-download-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseId: currentLicense.id,
          platform: platform,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate download link');
      }

      const data = await response.json();
      downloadUrl = DASHBOARD_CONFIG.apiBaseUrl + data.downloadUrl;
    }

    // Start download
    window.location.href = downloadUrl;

    // Track download
    trackEvent('download', {
      plan: currentLicense.tier,
      platform: platform,
      source: 'dashboard',
    });

    // Add to download history
    const newDownload = {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      filename: getFilenameForPlatform(platform),
      size: getFileSizeForPlatform(platform),
      downloadedAt: new Date().toISOString(),
    };

    downloadHistory.unshift(newDownload);
    updateDownloadHistory();

    hideModal();
    showSuccess('Download started! Check your downloads folder.');
  } catch (error) {
    console.error('Download error:', error);
    hideModal();
    showError(error.message || 'Failed to start download');
  }
}

// Helper functions for downloads
function getFilenameForPlatform(platform) {
  const filenames = {
    mac: 'RinaWarp Terminal-3.0.0.dmg',
    windows: 'RinaWarp Terminal Setup 3.0.0.exe',
    linux: 'RinaWarp Terminal-3.0.0.AppImage',
  };
  return filenames[platform] || 'Unknown';
}

function getFileSizeForPlatform(platform) {
  const sizes = {
    mac: '~106MB',
    windows: '~83MB',
    linux: '~110MB',
  };
  return sizes[platform] || 'Unknown';
}

// Billing functions
async function manageSubscription() {
  if (!currentLicense || !currentLicense.customerId) {
    showError('No subscription found to manage');
    return;
  }

  try {
    showLoadingModal('Redirecting to billing portal...');

    const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/api/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: currentLicense.customerId,
        returnUrl: window.location.origin + '/dashboard.html',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const data = await response.json();

    // Redirect to Stripe portal
    window.location.href = data.url;
  } catch (error) {
    console.error('Portal error:', error);
    hideModal();
    showError('Failed to open billing portal. Please try again.');
  }
}

async function changePaymentMethod() {
  await manageSubscription(); // Same as manage subscription
}

// Support functions
async function submitSupportRequest(event) {
  event.preventDefault();

  const subject = document.getElementById('support-subject').value;
  const message = document.getElementById('support-message').value;

  if (!subject || !message) {
    showError('Please fill in all fields');
    return;
  }

  try {
    showLoadingModal('Sending message...');

    const formData = {
      subject,
      message,
      licenseId: currentLicense?.id,
      email: currentLicense?.email,
      tier: currentLicense?.tier,
    };

    const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    // Reset form
    document.getElementById('support-form').reset();

    hideModal();
    showSuccess('Message sent successfully! We will get back to you soon.');

    // Track support request
    trackEvent('support_request', { subject, tier: currentLicense?.tier });
  } catch (error) {
    console.error('Support request error:', error);
    hideModal();
    showError('Failed to send message. Please try again or email us directly.');
  }
}

// License functions
function copyLicenseId() {
  if (!currentLicense?.id) {
    showError('No license ID to copy');
    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(currentLicense.id)
      .then(() => {
        showSuccess('License ID copied to clipboard!');
      })
      .catch(() => {
        fallbackCopyLicenseId();
      });
  } else {
    fallbackCopyLicenseId();
  }
}

function fallbackCopyLicenseId() {
  // Fallback copy method for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = currentLicense.id;
  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand('copy');
    showSuccess('License ID copied to clipboard!');
  } catch (error) {
    showError('Failed to copy. Please copy manually: ' + currentLicense.id);
  }

  document.body.removeChild(textArea);
}

// Authentication functions
function logout() {
  // Clear stored license
  localStorage.removeItem('rinawarp_license');

  // Clear session data
  currentLicense = null;
  currentUser = null;

  // Track logout
  trackEvent('logout', { source: 'dashboard' });

  // Redirect to home page
  window.location.href = 'index.html';
}

function redirectToLogin() {
  window.location.href = 'index.html';
}

// Utility functions
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

function showLoadingModal(message = 'Processing...') {
  const modal = document.getElementById('loading-modal');
  const messageEl = document.getElementById('loading-message');
  if (modal) {
    if (messageEl) messageEl.textContent = message;
    modal.classList.add('show');
  }
}

function hideModal() {
  const modal = document.getElementById('loading-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function showError(message) {
  hideModal();
  alert('Error: ' + message);
}

function showSuccess(message) {
  hideModal();
  alert('Success: ' + message);
}

// Analytics tracking
function trackEvent(eventName, properties = {}) {
  console.log('Track event:', eventName, properties);

  // Add user context
  const eventData = {
    ...properties,
    userId: currentLicense?.id,
    userTier: currentLicense?.tier,
    timestamp: new Date().toISOString(),
  };

  // Example with Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, eventData);
  }

  // Example with PostHog
  if (typeof posthog !== 'undefined') {
    posthog.capture(eventName, eventData);
  }
}

// Export functions for global access
window.showSection = showSection;
window.downloadPlatform = downloadPlatform;
window.manageSubscription = manageSubscription;
window.changePaymentMethod = changePaymentMethod;
window.submitSupportRequest = submitSupportRequest;
window.copyLicenseId = copyLicenseId;
window.logout = logout;
