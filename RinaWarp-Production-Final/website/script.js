// Configuration - Production Ready
const CONFIG = {
  // Live Stripe publishable key
  stripePublishableKey:
    'pk_live_51RaxSiG2ToGP7ChnER91fDiWR58IxAOLrCsj2qUlyHLwCazYLsuvDNH5EKPFIJ5onGTVlBvfvs8W8eKrNFaiCoAJ00u4j0qtki',

  // Production API endpoint (use localhost for development)
  apiBaseUrl:
    window.location.hostname === 'localhost'
      ? 'http://rinawarptech.com/api'
      : 'https://rinawarptech.com/api',

  // Live Stripe price IDs
  stripePriceIds: {
    beta: 'price_1Rp8OHG2ToGP7ChnZxNr7sqz', // $39 one-time
    pro: 'price_1Rpt4gG2ToGP7ChnRtkTclRq', // $29/month
    team: 'price_1Rpt4qG2ToGP7ChnEqCcc6kZ', // $49/month
  },

  // Replace with your actual download URLs (these would be from your server)
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

// Initialize Stripe
const stripe = Stripe(CONFIG.stripePublishableKey);

// Utility functions
function showModal() {
  const modal = document.getElementById('loading-modal');
  modal.classList.add('show');
}

function hideModal() {
  const modal = document.getElementById('loading-modal');
  modal.classList.remove('show');
}

function showError(message) {
  hideModal();
  alert('Error: ' + message);
}

function showSuccess(message) {
  hideModal();
  alert('Success: ' + message);
}

// Smooth scrolling
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}

// Free download functionality
async function downloadFree() {
  // For free version, detect user's platform and start download
  const platform = detectPlatform();
  const downloadUrl = CONFIG.downloadUrls.free[platform];

  if (downloadUrl) {
    // Track download event (replace with your analytics)
    trackEvent('download', { plan: 'free', platform: platform });

    // Start download
    window.location.href = downloadUrl;

    // Show success message after short delay
    setTimeout(() => {
      showSuccess('Download started! Check your downloads folder.');
    }, 1000);
  } else {
    showError('Download not available for your platform');
  }
}

// Platform-specific downloads
async function downloadPlatform(platform) {
  // For free version, start download immediately
  const downloadUrl = CONFIG.downloadUrls.free[platform];

  if (downloadUrl) {
    trackEvent('download', { plan: 'free', platform: platform });
    window.location.href = downloadUrl;

    setTimeout(() => {
      showSuccess('Download started! Check your downloads folder.');
    }, 1000);
  } else {
    showError('Download not available');
  }
}

// Purchase plan functionality
async function purchasePlan(planType) {
  showModal();

  try {
    const priceId = CONFIG.stripePriceIds[planType];
    if (!priceId) {
      throw new Error('Invalid plan selected');
    }

    // Create checkout session
    const response = await fetch(`${CONFIG.apiBaseUrl}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: priceId,
        successUrl: window.location.origin + '/success?plan=' + planType,
        cancelUrl: window.location.origin + '/cancelled',
        customerEmail: null, // Can be collected via a form if needed
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const session = await response.json();

    // Track purchase attempt
    trackEvent('purchase_attempt', { plan: planType });

    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: session.id,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Purchase error:', error);
    showError(error.message || 'Failed to process purchase');
  }
}

// Platform detection
function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('mac os')) {
    return 'mac';
  } else if (userAgent.includes('windows')) {
    return 'windows';
  } else if (userAgent.includes('linux')) {
    return 'linux';
  } else {
    // Default to linux for unknown platforms
    return 'linux';
  }
}

// Analytics tracking (replace with your preferred analytics service)
function trackEvent(eventName, properties = {}) {
  // Replace with your analytics implementation
  console.log('Track event:', eventName, properties);

  // Example with Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, properties);
  }

  // Example with Mixpanel
  if (typeof mixpanel !== 'undefined') {
    mixpanel.track(eventName, properties);
  }

  // Example with PostHog
  if (typeof posthog !== 'undefined') {
    posthog.capture(eventName, properties);
  }
}

// Handle success page
function handleSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const plan = urlParams.get('plan');

  if (sessionId) {
    // Activate license and provide download
    activateLicense(sessionId, plan);
  }
}

// Activate license after successful payment
async function activateLicense(sessionId, plan) {
  showModal();

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/activate-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to activate license');
    }

    const data = await response.json();
    const license = data.license;

    // Track successful purchase
    trackEvent('purchase_success', {
      plan: license.tier,
      licenseId: license.id,
    });

    // Store license info in localStorage for the user
    localStorage.setItem('rinawarp_license', JSON.stringify(license));

    // Provide download link
    providePremiumDownload(license.tier);

    hideModal();
  } catch (error) {
    console.error('License activation error:', error);
    showError(error.message || 'Failed to activate license');
  }
}

// Provide premium download after successful purchase
function providePremiumDownload(tier) {
  const platform = detectPlatform();
  const downloadUrl = CONFIG.downloadUrls[tier] && CONFIG.downloadUrls[tier][platform];

  if (downloadUrl) {
    // Create download page or directly start download
    showDownloadPage(tier, platform, downloadUrl);
  } else {
    showError('Download not available for your platform');
  }
}

// Show download page with instructions
function showDownloadPage(tier, platform, downloadUrl) {
  const downloadHTML = `
        <div style="text-align: center; padding: 40px;">
            <h2>🎉 Thank you for your purchase!</h2>
            <p>Your ${tier.toUpperCase()} license has been activated.</p>
            <br>
            <div style="background: #1a1a1b; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3>Download RinaWarp Terminal ${tier.toUpperCase()}</h3>
                <p>Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
                <br>
                <a href="${downloadUrl}" class="btn btn-primary btn-large" onclick="trackEvent('premium_download', {plan: '${tier}', platform: '${platform}'})">
                    <i class="fas fa-download"></i>
                    Download Now
                </a>
            </div>
            <p><small>Your download link has also been sent to your email.</small></p>
        </div>
    `;

  document.body.innerHTML = downloadHTML;
}

// Initialize page functionality
document.addEventListener('DOMContentLoaded', function () {
  // Handle success page
  if (window.location.pathname.includes('/success')) {
    handleSuccess();
  }

  // Track page view
  trackEvent('page_view', { page: window.location.pathname });

  // Add smooth scrolling to all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  // Add intersection observer for animations
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Observe elements that should animate
    document.querySelectorAll('.feature-card, .pricing-card, .download-card').forEach(el => {
      observer.observe(el);
    });
  }

  // Handle mobile menu (if you add one later)
  const mobileMenuButton = document.querySelector('.mobile-menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function () {
      mobileMenu.classList.toggle('show');
    });
  }
});

// Email subscription (if you want to add newsletter signup)
async function subscribeToNewsletter(email) {
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/subscribe-newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe');
    }

    trackEvent('newsletter_subscribe', { email });
    showSuccess('Successfully subscribed to our newsletter!');
  } catch (error) {
    showError('Failed to subscribe. Please try again.');
  }
}

// Contact form submission (if you add a contact form)
async function submitContactForm(formData) {
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    trackEvent('contact_form_submit', formData);
    showSuccess("Message sent successfully! We'll get back to you soon.");
  } catch (error) {
    showError('Failed to send message. Please try again.');
  }
}

// Export functions for global access
window.scrollToSection = scrollToSection;
window.downloadFree = downloadFree;
window.downloadPlatform = downloadPlatform;
window.purchasePlan = purchasePlan;
window.subscribeToNewsletter = subscribeToNewsletter;
window.submitContactForm = submitContactForm;
