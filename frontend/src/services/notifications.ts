export function registerPushNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function sendPushNotification(title: string, body: string, url?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png' });
  if (url) n.onclick = () => { window.open(url, '_blank'); n.close(); };
}
