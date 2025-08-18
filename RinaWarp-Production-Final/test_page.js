// Quick test to see if basic page elements are loading
console.log('Testing RinaWarp Terminal...');

// Check if main elements exist
const appContainer = document.querySelector('.app-container');
const terminal = document.querySelector('#terminal');
const header = document.querySelector('.header');

if (appContainer) {
  console.log('✅ App container found');
} else {
  console.error('❌ App container not found');
}

if (header) {
  console.log('✅ Header found');
} else {
  console.error('❌ Header not found');
}

if (terminal) {
  console.log('✅ Terminal element found');
} else {
  console.error('❌ Terminal element not found');
}

// Test CSS variables
const computedStyle = getComputedStyle(document.documentElement);
const primaryGold = computedStyle.getPropertyValue('--primary-gold');

if (primaryGold) {
  console.log('✅ CSS variables loaded, --primary-gold:', primaryGold);
} else {
  console.error('❌ CSS variables not loaded properly');
}

console.log('Page testing complete. Check above for any errors.');
