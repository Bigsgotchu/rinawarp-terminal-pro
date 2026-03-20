/**
 * DOM Ready Utility
 *
 * Provides a promise-based way to wait for DOMContentLoaded.
 */

export function domReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    } else {
      resolve()
    }
  })
}