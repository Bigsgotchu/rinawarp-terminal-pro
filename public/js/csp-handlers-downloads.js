// Auto-generated CSP-safe event handlers for downloads.html

function onclickHandler1(element) {
  this.parentElement.remove()
}

// Event delegation for CSP compliance
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.csp-event-handler').forEach(function(element) {
    
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler1(this);
      });
    }
  });
});
