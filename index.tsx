
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/**
 * GLOBAL STUB: LockManager bypass
 * In some restricted environments (like specific sandboxed iframes or privacy-hardened browsers),
 * navigator.locks.request() throws a SecurityError or is not allowed.
 * We replace it with a no-op that immediately executes the callback.
 */
if (typeof window !== 'undefined') {
  const stubLocks = {
    request: async (_name: string, _options: any, callback?: any) => {
      const cb = typeof _options === 'function' ? _options : callback;
      if (typeof cb === 'function') {
        try {
          return await cb();
        } catch (e) {
          console.error('Error in stubbed lock callback:', e);
        }
      }
    },
    query: async () => ({ held: [], pending: [] })
  };

  try {
    // Attempt to define on the navigator instance
    Object.defineProperty(navigator, 'locks', {
      value: stubLocks,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try {
      // Fallback: Attempt to define on the prototype
      Object.defineProperty(Navigator.prototype, 'locks', {
        get: () => stubLocks,
        configurable: true
      });
    } catch (e2) {
      console.warn('LockManager stubbing failed. Native errors may persist.', e2);
    }
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
