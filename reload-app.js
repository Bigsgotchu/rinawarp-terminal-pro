// Script to reload the Electron app
// This can be run in the Electron developer console

if (window.location) {
  window.location.reload();
} else {
  console.error('Unable to reload - window.location not available');
}
