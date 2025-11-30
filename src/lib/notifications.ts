import { prisma } from '@/lib/db';
import { sendFCMNotification } from '@/lib/fcm';

/**
 * Send push notifications to users via FCM
 */
export async function sendPushNotifications(
  userIds: string[],
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  try {
    // Get FCM tokens for all target users
    const fcmTokens = await prisma.fcmToken.findMany({
      where: {
        userId: {
          in: userIds
        }
      },
      select: {
        token: true
      }
    });

    if (fcmTokens.length === 0) {
      console.log('No FCM tokens found for users:', userIds);
      return;
    }

    const tokens = fcmTokens.map((ft) => ft.token);

    // Send FCM notifications
    const result = await sendFCMNotification(tokens, notification, data);

    console.log(
      `FCM notifications sent: ${result.success} successful, ${result.failure} failed`
    );

    // Optionally: Remove invalid tokens (tokens that failed to send)
    // This would require tracking which tokens failed, which FCM doesn't provide directly
    // You might want to implement token cleanup based on delivery receipts
  } catch (error) {
    console.error('Error sending push notifications:', error);
    // Don't throw - notifications are not critical for the main flow
  }
}

/**
 * Send push notification to a single user
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<void> {
  await sendPushNotifications([userId], notification, data);
}
