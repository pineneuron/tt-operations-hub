import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types/user-role';
import {
  getKathmanduHours,
  getKathmanduMinutes,
  getTodayInKathmandu
} from '@/lib/kathmandu-time';

const AUTO_CHECKOUT_HOUR = 23; // 11 PM
const AUTO_CHECKOUT_MINUTE = 59; // 59 minutes

function isAutoCheckoutTime(date: Date): boolean {
  const hour = getKathmanduHours(date);
  const minute = getKathmanduMinutes(date);
  return hour === AUTO_CHECKOUT_HOUR && minute === AUTO_CHECKOUT_MINUTE;
}

export async function POST(request: Request) {
  try {
    // Verify request is from authorized source (you can add API key validation here)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = getTodayInKathmandu(); // Get today's date in Kathmandu timezone

    // Find all active sessions (checked in but not checked out) for today
    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        date: today,
        checkOutTime: null,
        user: {
          role: {
            in: [UserRole.STAFF, UserRole.FINANCE]
          },
          isActive: true
        }
      },
      include: {
        user: true
      }
    });

    const results = [];

    for (const session of activeSessions) {
      try {
        // Get the latest location check or use check-in location
        const latestLocation = await prisma.attendanceLocation.findFirst({
          where: {
            sessionId: session.id
          },
          orderBy: {
            timestamp: 'desc'
          }
        });

        const checkOutLat =
          latestLocation?.latitude || session.checkInLocationLat;
        const checkOutLng =
          latestLocation?.longitude || session.checkInLocationLng;
        const checkOutAddress =
          latestLocation?.address || session.checkInLocationAddress;

        // Calculate total hours
        const totalHours =
          (now.getTime() - session.checkInTime.getTime()) / (1000 * 60 * 60);

        // Update session with auto check-out
        const updatedSession = await prisma.attendanceSession.update({
          where: {
            id: session.id
          },
          data: {
            checkOutTime: now,
            checkOutLocationLat: checkOutLat,
            checkOutLocationLng: checkOutLng,
            checkOutLocationAddress: checkOutAddress,
            totalHours,
            autoCheckedOut: true,
            status: 'AUTO_CHECKED_OUT',
            flags: ['AUTO_CHECKED_OUT']
          }
        });

        // Create final location check
        if (checkOutLat && checkOutLng) {
          await prisma.attendanceLocation.create({
            data: {
              sessionId: session.id,
              timestamp: now,
              latitude: checkOutLat,
              longitude: checkOutLng,
              address: checkOutAddress || null
            }
          });
        }

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
              title: `${session.user.name || session.user.email} was auto-checked out`,
              body: `Total hours: ${totalHours.toFixed(2)}`,
              entityType: 'ATTENDANCE',
              entityId: updatedSession.id,
              data: {
                type: 'AUTO_CHECK_OUT',
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
        }

        results.push({
          sessionId: session.id,
          userId: session.userId,
          success: true
        });
      } catch (error) {
        console.error(`Failed to auto-checkout session ${session.id}:`, error);
        results.push({
          sessionId: session.id,
          userId: session.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Auto check-out error:', error);
    return NextResponse.json(
      { error: 'Failed to process auto check-out' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET() {
  const now = new Date();
  return NextResponse.json({
    message: 'Auto check-out endpoint. Use POST with authorization header.',
    time: now.toISOString(),
    kathmanduHour: getKathmanduHours(now),
    kathmanduMinute: getKathmanduMinutes(now),
    isAutoCheckoutTime: isAutoCheckoutTime(now)
  });
}
