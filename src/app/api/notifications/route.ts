import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get notifications for the current user
    const notifications = await prisma.notification.findMany({
      where: {
        receipts: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        receipts: {
          where: {
            userId: session.user.id
          },
          take: 1
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to 50 most recent notifications
    });

    const formattedNotifications = notifications.map((notification) => {
      const receipt = notification.receipts[0];
      return {
        id: notification.id,
        title: notification.title,
        message: notification.body || '',
        category: notification.category,
        entityType: notification.entityType,
        entityId: notification.entityId,
        data: notification.data,
        read: !!receipt?.seenAt,
        createdAt: notification.createdAt,
        createdBy: notification.createdBy
      };
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount: formattedNotifications.filter((n) => !n.read).length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
