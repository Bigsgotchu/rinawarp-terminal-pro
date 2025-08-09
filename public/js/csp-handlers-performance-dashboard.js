// Auto-generated CSP-safe event handlers for performance-dashboard.html

function onclickHandler1(element) {
  refreshDashboard()
}

function onclickHandler2(element) {
  toggleAutoRefresh()
}

// Event delegation for CSP compliance
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.csp-event-handler').forEach(function(element) {
    
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler1(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler2(this);
      });
    }
  });
});
