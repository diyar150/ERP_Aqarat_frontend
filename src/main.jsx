import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n/index.js';
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    // Check for updates when the tab becomes visible again
    const ping = () => registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') ping();
    });
    setInterval(ping, 60 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')).render(
  <>
    <App />
  </>,
)
