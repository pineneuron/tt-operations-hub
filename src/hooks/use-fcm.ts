'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getFCMToken,
  onForegroundMessage,
  requestNotificationPermission
} from '@/lib/firebase';
import { toast } from 'sonner';

export function useFCM() {
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );

  // Check if FCM is supported
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission and get token
  const initializeFCM = useCallback(async () => {
    if (!isSupported) {
      console.warn('FCM is not supported in this environment');
      return;
    }

    try {
      const hasPermission = await requestNotificationPermission();
      setPermission(Notification.permission);

      if (!hasPermission) {
        console.warn('Notification permission not granted');
        return;
      }

      const fcmToken = await getFCMToken();
      if (fcmToken) {
        setToken(fcmToken);

        // Save token to server
        try {
          const userAgent =
            typeof navigator !== 'undefined' ? navigator.userAgent : null;
          const response = await fetch('/api/fcm/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token: fcmToken,
              deviceId: null, // Can be enhanced with device fingerprinting
              userAgent
            })
          });

          if (!response.ok) {
            console.error('Failed to save FCM token to server');
          }
        } catch (error) {
          console.error('Error saving FCM token:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }, [isSupported]);

  // Set up foreground message listener
  useEffect(() => {
    if (!isSupported) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);

      // Show toast notification
      toast.info(payload.notification?.title || 'New Notification', {
        description: payload.notification?.body || '',
        duration: 5000
      });

      // Trigger custom event for notification component
      window.dispatchEvent(
        new CustomEvent('fcm-notification', {
          detail: payload
        })
      );
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isSupported]);

  // Initialize on mount
  useEffect(() => {
    if (isSupported && permission === null) {
      initializeFCM();
    }
  }, [isSupported, permission, initializeFCM]);

  // Handle token refresh (FCM tokens can expire)
  useEffect(() => {
    if (!isSupported || !token) return;

    // Listen for token refresh
    const handleTokenRefresh = async () => {
      const newToken = await getFCMToken();
      if (newToken && newToken !== token) {
        setToken(newToken);
        // Update token on server
        try {
          const userAgent =
            typeof navigator !== 'undefined' ? navigator.userAgent : null;
          await fetch('/api/fcm/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token: newToken,
              deviceId: null,
              userAgent
            })
          });
        } catch (error) {
          console.error('Error updating FCM token:', error);
        }
      }
    };

    // Check for token refresh periodically (every 5 minutes)
    const interval = setInterval(handleTokenRefresh, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isSupported, token]);

  return {
    token,
    isSupported,
    permission,
    initializeFCM
  };
}
