const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeBtn = document.querySelector('.close');

helpBtn.addEventListener('click', () => {
  console.log('❓ Showing help system');
  helpModal.style.display = 'block';
  showNotification('Help system activated', 'info');
});

closeBtn.addEventListener('click', () => {
  helpModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === helpModal) {
    helpModal.style.display = 'none';
  }
});

function showNotification(message, type) {
  // Simple alert for demo; replace with your own notification system
  alert(`${type.toUpperCase()}: ${message}`);
}
