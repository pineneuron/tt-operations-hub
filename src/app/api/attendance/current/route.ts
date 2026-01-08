import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types/user-role';
import { getTodayInKathmandu } from '@/lib/kathmandu-time';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only STAFF and FINANCE can access
    if (userRole !== UserRole.STAFF && userRole !== UserRole.FINANCE) {
      return NextResponse.json(
        { error: 'Only STAFF and FINANCE can access attendance' },
        { status: 403 }
      );
    }

    const now = new Date();
    const today = getTodayInKathmandu(); // Get today's date in Kathmandu timezone

    // Find active session (check-in without check-out) for today
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        checkOutTime: null
      },
      orderBy: {
        checkInTime: 'desc'
      },
      include: {
        locationChecks: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1 // Get latest location check
        }
      }
    });

    // Get all sessions for today
    const todaySessions = await prisma.attendanceSession.findMany({
      where: {
        userId: session.user.id,
        date: today
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    return NextResponse.json({
      activeSession,
      todaySessions,
      hasActiveSession: !!activeSession
    });
  } catch (error) {
    console.error('Get current attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to get attendance' },
      { status: 500 }
    );
  }
}
