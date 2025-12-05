import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (optional - fails gracefully if not configured)
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccount) {
      console.warn(
        'FIREBASE_SERVICE_ACCOUNT_KEY is not configured - Firebase Admin will not be initialized'
      );
      // Firebase is optional - continue without throwing
    } else {
      const serviceAccountJson = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson)
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    // Firebase is optional - continue without throwing
  }
}

/**
 * Send FCM notification to specific user tokens
 */
export async function sendFCMNotification(
  tokens: string[],
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<{ success: number; failure: number }> {
  if (!admin.apps.length) {
    console.warn(
      'Firebase Admin is not initialized - FCM notifications will not be sent'
    );
    return { success: 0, failure: tokens.length };
  }

  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }

  try {
    const message = {
      notification,
      data: data
        ? Object.entries(data).reduce(
            (acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            },
            {} as Record<string, string>
          )
        : undefined,
      webpush: {
        fcmOptions: {
          link: data?.url || '/dashboard'
        }
      },
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return {
      success: response.successCount,
      failure: response.failureCount
    };
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return { success: 0, failure: tokens.length };
  }
}

/**
 * Send FCM notification to a single token
 */
export async function sendFCMNotificationToToken(
  token: string,
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<boolean> {
  const result = await sendFCMNotification([token], notification, data);
  return result.success > 0;
}

export { admin };
