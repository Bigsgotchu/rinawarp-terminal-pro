// Auto-generated CSP-safe event handlers for test-payment.html

function onclickHandler1(element) {
  if (typeof testAPI === 'function') {
    testAPI();
  }
}

function onclickHandler2(element) {
  if (typeof testAPI === 'function') {
    testAPI();
  }
}

function onclickHandler3(element) {
  if (typeof testCheckoutAPI === 'function') {
    testCheckoutAPI();
  }
}

function onclickHandler4(element) {
  if (typeof initStripeTest === 'function') {
    initStripeTest();
  }
}

function onclickHandler5(element) {
  if (typeof testPaymentFlow === 'function') {
    testPaymentFlow();
  }
}

function onclickHandler6(element) {
  if (typeof testPaymentFlow === 'function') {
    testPaymentFlow();
  }
}

function onclickHandler7(element) {
  if (typeof testPaymentFlow === 'function') {
    testPaymentFlow();
  }
}

function onclickHandler8(element) {
  if (typeof testDownload === 'function') {
    testDownload();
  }
}

function onclickHandler9(element) {
  if (typeof testDownload === 'function') {
    testDownload();
  }
}

function onclickHandler10(element) {
  if (typeof testDownload === 'function') {
    testDownload();
  }
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
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler6(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler7(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler8(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler9(this);
      });
    }
    if (element.hasAttribute('data-onclick')) {
      element.addEventListener('click', function(event) {
        onclickHandler10(this);
      });
    }
  });
});
