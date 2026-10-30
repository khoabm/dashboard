/** Opts into installation without changing route, Auth or data lifecycle. */
export function registerPwa() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener(
    'load',
    () => {
      // Avoid skipWaiting and reload: existing drafts and writes own their lifetimes.
      void navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch(() => {
        // Installation is optional: registration errors must not break the website.
      });
    },
    { once: true },
  );
}
