// Debug script to check AI assistance checkbox
// Run this in the browser developer console

console.log('=== AI Assistance Checkbox Debug ===');

// 1. Check if element exists
const checkbox = document.getElementById('ai-assistance');
console.log('Checkbox element:', checkbox);

if (checkbox) {
  // 2. Check visibility properties
  const styles = window.getComputedStyle(checkbox);
  console.log('Display:', styles.display);
  console.log('Visibility:', styles.visibility);
  console.log('Opacity:', styles.opacity);
  console.log('Position:', styles.position);
  console.log('Z-index:', styles.zIndex);
    
  // 3. Check parent elements
  let parent = checkbox.parentElement;
  while (parent && parent !== document.body) {
    const parentStyles = window.getComputedStyle(parent);
    console.log(`Parent ${parent.tagName} (${parent.className}):`, {
      display: parentStyles.display,
      visibility: parentStyles.visibility,
      opacity: parentStyles.opacity
    });
    parent = parent.parentElement;
  }
    
  // 4. Check checkbox state
  console.log('Checked state:', checkbox.checked);
  console.log('Disabled state:', checkbox.disabled);
    
  // 5. Check bounding box
  const rect = checkbox.getBoundingClientRect();
  console.log('Bounding box:', rect);
    
  // 6. Try to focus and highlight the element
  checkbox.style.border = '3px solid red';
  checkbox.style.background = 'yellow';
  checkbox.focus();
    
  console.log('Highlighted checkbox - check if you can see it now!');
} else {
  console.log('ERROR: Checkbox element not found!');
}

// 7. Check settings modal visibility
const modal = document.getElementById('settings-modal');
console.log('Settings modal:', modal);
if (modal) {
  const modalStyles = window.getComputedStyle(modal);
  console.log('Modal display:', modalStyles.display);
  console.log('Modal visibility:', modalStyles.visibility);
  console.log('Modal classes:', modal.className);
}
