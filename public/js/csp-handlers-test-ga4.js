// Auto-generated CSP-safe event handlers for test-ga4.html

function onclickHandler1(element) {
  testPageView()
}

function onclickHandler2(element) {
  testCustomEvent()
}

function onclickHandler3(element) {
  testPricingView()
}

function onclickHandler4(element) {
  testPlanSelect()
}

function onclickHandler5(element) {
  testCheckoutStart()
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
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler3(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler4(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler5(this);
      });
    }
  });
});
