/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Demo script showcasing visual overlay features and error handling
const {
  createOverlay,
  showError,
  showSuccess,
  showWarning,
  showLoading,
  hideOverlay,
} = require('../src/overlays');

// Helper function to simulate async operations
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Demo all basic overlay types
async function demoBasicOverlays() {
  console.log('Demonstrating basic overlay types...');

  // Success overlay
  showSuccess('Operation completed successfully!');
  await delay(2000);
  hideOverlay();

  // Warning overlay
  showWarning('Resource usage approaching limits');
  await delay(2000);
  hideOverlay();

  // Error overlay
  showError('Failed to connect to remote service');
  await delay(2000);
  hideOverlay();

  // Loading overlay
  showLoading('Processing request...');
  await delay(2000);
  hideOverlay();
}

// Demo custom overlay configurations
async function demoCustomOverlays() {
  console.log('Demonstrating custom overlay configurations...');

  // Custom positioning
  createOverlay({
    message: 'Custom positioned overlay',
    position: 'top-right',
    duration: 2000,
  });

  await delay(2500);

  // Custom styling
  createOverlay({
    message: 'Styled overlay',
    backgroundColor: '#2a2a2a',
    textColor: '#ffffff',
    fontSize: '18px',
    padding: '20px',
    duration: 2000,
  });

  await delay(2500);

  // Custom animation
  createOverlay({
    message: 'Animated overlay',
    animationIn: 'slideIn',
    animationOut: 'fadeOut',
    duration: 2000,
  });
}

// Demo error handling and recovery scenarios
async function demoErrorHandling() {
  console.log('Demonstrating error handling and recovery...');

  try {
    // Simulate a failed operation
    showLoading('Uploading file...');
    await delay(1000);
    throw new Error(new Error('Network timeout'));
  } catch (error) {
    // Show error state
    showError(`Upload failed: ${error.message}`);
    await delay(2000);

    // Show retry option
    createOverlay({
      message: 'Retrying upload...',
      type: 'info',
      showRetryButton: true,
      onRetry: async () => {
        showLoading('Retrying upload...');
        await delay(1000);
        showSuccess('Upload completed successfully!');
      },
    });
  }
}

// Demo stacked/queued overlays
async function demoStackedOverlays() {
  console.log('Demonstrating stacked overlays...');

  // Show multiple overlays in sequence
  createOverlay({
    message: 'Processing step 1',
    duration: 1500,
    queueBehavior: 'stack',
  });

  createOverlay({
    message: 'Processing step 2',
    duration: 1500,
    queueBehavior: 'stack',
  });

  createOverlay({
    message: 'Processing step 3',
    duration: 1500,
    queueBehavior: 'stack',
  });
}

// Main demo function
async function runDemo() {
  console.log('Starting visual overlays demo...');

  try {
    await demoBasicOverlays();
    await delay(1000);

    await demoCustomOverlays();
    await delay(1000);

    await demoErrorHandling();
    await delay(1000);

    await demoStackedOverlays();

    console.log('Demo completed successfully!');
  } catch (error) {
    console.error('Demo failed:', error);
    showError('Demo failed: ' + error.message);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo();
}

module.exports = {
  runDemo,
  demoBasicOverlays,
  demoCustomOverlays,
  demoErrorHandling,
  demoStackedOverlays,
};
