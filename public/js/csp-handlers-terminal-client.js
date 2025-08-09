// Auto-generated CSP-safe event handlers for terminal-client.html

function onclickHandler1(element) {
  connect()
}

function onclickHandler2(element) {
  disconnect()
}

function onclickHandler3(element) {
  createTerminal()
}

function onclickHandler4(element) {
  closeTerminal()
}

function onclickHandler5(element) {
  refreshStatus()
}

function onclickHandler6(element) {
  sendCommand()
}

function onclickHandler7(element) {
  clearLog()
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
  });
});
