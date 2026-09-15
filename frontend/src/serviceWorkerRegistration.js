export function registerServiceWorker() {
  const isProd = import.meta.env ? import.meta.env.PROD : process.env.NODE_ENV === 'production';
  if ('serviceWorker' in navigator && isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA] ServiceWorker registration failed:', error);
        });
    });
  }
}
