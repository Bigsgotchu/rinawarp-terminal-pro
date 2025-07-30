/**
 * Error Suppression for Renderer Process
 * Suppresses known harmless Electron/Chromium warnings
 */

(function () {
  // List of known harmless errors to suppress
  const knownHarmlessPatterns = [
    /eglQueryDeviceAttribEXT: Bad attribute/,
    /Failed to enable receiving autoplay permission data/,
    /ContextResult::kFatalFailure: SharedImageStub/,
    /Unable to create a GL context/,
    /task_policy_set invalid argument/,
    /Autofill\.(enable|setAddresses)/,
    /DOM\.enable/,
    /CSS\.enable/,
    /Overlay\.enable/,
    /Log\.enable/,
    /Runtime\.enable/,
    /Network\.enable/,
    /Target\.(setAutoAttach|setDiscoverTargets)/,
    /Performance\.enable/,
    /DevTools protocol/,
    /Received unexpected number of/,
    /GPU process isn't usable/,
    /Extension server error/,
    /SharedImageStub/,
    /Failed to call method/,
    /Invalid browser context/,
    /Cannot read properties of undefined/,
  ];

  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;

  // Override console.error
  console.error = function (...args) {
    const errorString = args.map(arg => String(arg)).join(' ');
    const shouldSuppress = knownHarmlessPatterns.some(pattern => pattern.test(errorString));

    if (!shouldSuppress) {
      originalConsoleError.apply(console, args);
    } else if (window.VERBOSE_LOGGING) {
      originalConsoleError.apply(console, ['[SUPPRESSED ERROR]', ...args]);
    }
  };

  // Override console.warn
  console.warn = function (...args) {
    const warnString = args.map(arg => String(arg)).join(' ');
    const shouldSuppress = knownHarmlessPatterns.some(pattern => pattern.test(warnString));

    if (!shouldSuppress) {
      originalConsoleWarn.apply(console, args);
    } else if (window.VERBOSE_LOGGING) {
      originalConsoleWarn.apply(console, ['[SUPPRESSED WARN]', ...args]);
    }
  };

  // Override console.log for specific patterns
  console.log = function (...args) {
    const logString = args.map(arg => String(arg)).join(' ');
    const shouldSuppress = knownHarmlessPatterns.some(pattern => pattern.test(logString));

    if (!shouldSuppress) {
      originalConsoleLog.apply(console, args);
    } else if (window.VERBOSE_LOGGING) {
      originalConsoleLog.apply(console, ['[SUPPRESSED LOG]', ...args]);
    }
  };

  // Override window.onerror for global error handling
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const errorString = String(message);
    const shouldSuppress = knownHarmlessPatterns.some(pattern => pattern.test(errorString));

    if (!shouldSuppress) {
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    }

    if (window.VERBOSE_LOGGING) {
      console.log('[SUPPRESSED GLOBAL ERROR]', message);
    }
    return true; // Prevent default error handling
  };

  // Override unhandledrejection event
  window.addEventListener('unhandledrejection', function (event) {
    const reasonString = event.reason ? String(event.reason) : '';
    const shouldSuppress = knownHarmlessPatterns.some(pattern => pattern.test(reasonString));

    if (shouldSuppress) {
      event.preventDefault();
      if (window.VERBOSE_LOGGING) {
        console.log('[SUPPRESSED PROMISE REJECTION]', event.reason);
      }
    }
  });

  // Add CSS to hide DevTools errors in console (if DevTools are open)
  const style = document.createElement('style');
  style.textContent = `
    /* Hide specific DevTools console errors */
    .console-message-wrapper[data-message*="eglQueryDeviceAttribEXT"],
    .console-message-wrapper[data-message*="Autofill.enable"],
    .console-message-wrapper[data-message*="task_policy_set"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  console.log('✅ Error suppression initialized');
})();
