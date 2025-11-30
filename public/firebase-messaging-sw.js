// Import Firebase scripts
importScripts(
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
);

// Initialize Firebase - using environment variables injected at build time
// For production, these should be replaced with actual values
// Or use the API endpoint approach below
let messaging = null;

// Try to initialize Firebase with config from API endpoint
// Fallback to hardcoded values if API fails (for development)
async function initializeFirebase() {
  try {
    const response = await fetch('/api/fcm/config');
    const config = await response.json();

    if (config.error) {
      console.error(
        '[firebase-messaging-sw.js] Firebase config error:',
        config.error
      );
      // Fallback: try to use environment variables if available
      // (These would need to be injected at build time)
      return;
    }

    firebase.initializeApp(config);
    messaging = firebase.messaging();
    console.log('[firebase-messaging-sw.js] Firebase initialized successfully');

    // Set up background message handler
    messaging.onBackgroundMessage((payload) => {
      handleBackgroundMessage(payload);
    });
  } catch (error) {
    console.error(
      '[firebase-messaging-sw.js] Failed to initialize Firebase:',
      error
    );
  }
}

// Initialize on service worker activation
initializeFirebase();

// Handle background messages
function handleBackgroundMessage(payload) {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    data: payload.data || {},
    tag: payload.data?.notificationId || 'notification',
    requireInteraction: false,
    silent: false
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  const data = event.notification.data;
  let url = '/dashboard';

  // Determine URL based on notification data
  if (data?.entityType) {
    switch (data.entityType) {
      case 'LEAVE':
        url = '/dashboard/leaves';
        break;
      case 'ATTENDANCE':
        url = '/dashboard/attendance/history';
        break;
      case 'EVENT':
        url = data.entityId
          ? `/dashboard/events/${data.entityId}`
          : '/dashboard/events';
        break;
      case 'JOB':
        url = data.entityId
          ? `/dashboard/jobs/${data.entityId}`
          : '/dashboard/jobs';
        break;
      case 'MEETING':
        url = '/dashboard/meeting';
        break;
      case 'TRANSPORTATION':
        url = '/dashboard/transportation';
        break;
      default:
        url = '/dashboard';
    }
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
