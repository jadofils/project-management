import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './lib/ThemeContext';
import { registerPushNotifications } from './services/notifications';
import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Request notification permission
setTimeout(() => registerPushNotifications(), 3000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
