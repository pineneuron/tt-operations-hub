import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types/user-role';
import {
  getExpectedCheckInTime,
  getTodayInKathmandu,
  isLateCheckIn
} from '@/lib/kathmandu-time';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only STAFF and FINANCE can check in
    if (userRole !== UserRole.STAFF && userRole !== UserRole.FINANCE) {
      return NextResponse.json(
        { error: 'Only STAFF and FINANCE can check in' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { workLocation, latitude, longitude, address, notes, lateReason } =
      body;

    // Validate location is provided
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location is required for check-in' },
        { status: 400 }
      );
    }

    if (
      !workLocation ||
      (workLocation !== 'OFFICE' && workLocation !== 'SITE')
    ) {
      return NextResponse.json(
        { error: 'Work location must be OFFICE or SITE' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = getTodayInKathmandu(); // Get today's date in Kathmandu timezone

    const expectedCheckInTime = getExpectedCheckInTime(now);
    const isLate = isLateCheckIn(now);
    const lateMinutes = isLate
      ? Math.floor(
          (now.getTime() - expectedCheckInTime.getTime()) / (1000 * 60)
        )
      : null;

    // Validate late reason if late
    if (isLate && !lateReason) {
      return NextResponse.json(
        { error: 'Late reason is required when checking in late' },
        { status: 400 }
      );
    }

    // Create attendance session
    const sessionRecord = await prisma.attendanceSession.create({
      data: {
        userId: session.user.id,
        date: today,
        workLocation,
        status: isLate ? 'LATE' : 'ON_TIME',
        checkInTime: now,
        expectedCheckInTime,
        isLate,
        lateMinutes,
        lateReason: isLate ? lateReason : null,
        checkInLocationLat: latitude,
        checkInLocationLng: longitude,
        checkInLocationAddress: address,
        checkInNotes: notes || null
      }
    });

    // Create initial location check
    await prisma.attendanceLocation.create({
      data: {
        sessionId: sessionRecord.id,
        timestamp: now,
        latitude,
        longitude,
        address: address || null
      }
    });

    // Send notification to PLATFORM_ADMIN and ADMIN
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.PLATFORM_ADMIN, UserRole.ADMIN]
        },
        isActive: true
      }
    });

    if (admins.length > 0) {
      // Format late time as hours and minutes
      let lateTimeText = '';
      if (isLate && lateMinutes) {
        const hours = Math.floor(lateMinutes / 60);
        const minutes = lateMinutes % 60;
        if (hours > 0 && minutes > 0) {
          lateTimeText = ` (${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} late)`;
        } else if (hours > 0) {
          lateTimeText = ` (${hours} hour${hours > 1 ? 's' : ''} late)`;
        } else {
          lateTimeText = ` (${minutes} minute${minutes > 1 ? 's' : ''} late)`;
        }
      }

      const notification = await prisma.notification.create({
        data: {
          category: 'ATTENDANCE',
          title: `${session.user.name || session.user.email} checked in`,
          body: `Work location: ${workLocation}${lateTimeText}`,
          entityType: 'ATTENDANCE',
          entityId: sessionRecord.id,
          data: {
            type: 'CHECK_IN',
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            workLocation,
            checkInTime: now.toISOString(),
            isLate,
            lateMinutes
          }
        }
      });

      // Create notification receipts for all admins
      await prisma.notificationReceipt.createMany({
        data: admins.map((admin) => ({
          notificationId: notification.id,
          userId: admin.id,
          channel: 'IN_APP'
        }))
      });

      // Send FCM push notifications to admins
      const { sendPushNotifications } = await import('@/lib/notifications');
      await sendPushNotifications(
        admins.map((admin) => admin.id),
        {
          title: notification.title,
          body: notification.body || ''
        },
        {
          notificationId: notification.id,
          entityType: notification.entityType || 'ATTENDANCE',
          entityId: notification.entityId || '',
          url: '/dashboard/attendance/history'
        }
      );
    }

    return NextResponse.json({
      success: true,
      session: sessionRecord
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
