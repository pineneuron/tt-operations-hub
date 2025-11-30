import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types/user-role';
import { isWithinCheckoutRadius, calculateDistance } from '@/lib/distance';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only STAFF and FINANCE can check out
    if (userRole !== UserRole.STAFF && userRole !== UserRole.FINANCE) {
      return NextResponse.json(
        { error: 'Only STAFF and FINANCE can check out' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { latitude, longitude, address, notes } = body;

    // Validate location is provided
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location is required for check-out' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    // Find the active session for today (most recent check-in without check-out)
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        checkOutTime: null
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active check-in session found' },
        { status: 404 }
      );
    }

    // Validate check-out location is within allowed radius (500 meters from check-in)
    // Check-in location is required - if missing, block checkout
    if (
      !activeSession.checkInLocationLat ||
      !activeSession.checkInLocationLng
    ) {
      return NextResponse.json(
        {
          error: 'CHECKOUT_LOCATION_MISSING',
          message:
            'Check-in location is missing. Cannot validate check-out location. Please contact administrator.'
        },
        { status: 403 }
      );
    }

    // Validate distance - ALWAYS run this validation
    const distance = calculateDistance(
      activeSession.checkInLocationLat,
      activeSession.checkInLocationLng,
      latitude,
      longitude
    );

    const withinRadius = distance <= 500;

    if (!withinRadius) {
      // Checkout is completely blocked if outside 500m radius
      return NextResponse.json(
        {
          error: 'CHECKOUT_OUT_OF_RADIUS',
          message: `Check-out location is ${Math.round(distance)} meters away from check-in location (maximum allowed: 500 meters). Check-out from this location is not allowed. Please check out from a location within 500 meters of your check-in location.`
        },
        { status: 403 }
      );
    }

    // Calculate total hours
    const totalHours =
      (now.getTime() - activeSession.checkInTime.getTime()) / (1000 * 60 * 60);

    // Update session with check-out
    const updatedSession = await prisma.attendanceSession.update({
      where: {
        id: activeSession.id
      },
      data: {
        checkOutTime: now,
        checkOutLocationLat: latitude,
        checkOutLocationLng: longitude,
        checkOutLocationAddress: address,
        checkOutNotes: notes || null,
        totalHours
      }
    });

    // Create final location check
    await prisma.attendanceLocation.create({
      data: {
        sessionId: activeSession.id,
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
      const notification = await prisma.notification.create({
        data: {
          category: 'ATTENDANCE',
          title: `${session.user.name || session.user.email} checked out`,
          body: `Total hours: ${totalHours.toFixed(2)}`,
          entityType: 'ATTENDANCE',
          entityId: updatedSession.id,
          data: {
            type: 'CHECK_OUT',
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            checkOutTime: now.toISOString(),
            totalHours
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
      session: updatedSession
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Failed to check out' }, { status: 500 });
  }
}
