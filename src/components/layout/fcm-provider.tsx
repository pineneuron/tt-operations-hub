'use client';

import { useEffect } from 'react';
import { useFCM } from '@/hooks/use-fcm';

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { initializeFCM, isSupported } = useFCM();

  useEffect(() => {
    if (isSupported) {
      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      }
    }
  }, [isSupported]);

  return <>{children}</>;
}
