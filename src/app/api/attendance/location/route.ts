import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types/user-role';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only STAFF and FINANCE can track location
    if (userRole !== UserRole.STAFF && userRole !== UserRole.FINANCE) {
      return NextResponse.json(
        { error: 'Only STAFF and FINANCE can track location' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId, latitude, longitude, address, accuracy } = body;

    if (!sessionId || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Session ID and location are required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const attendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        checkOutTime: null // Only track location for active sessions
      }
    });

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Active session not found' },
        { status: 404 }
      );
    }

    // Create location check
    const locationCheck = await prisma.attendanceLocation.create({
      data: {
        sessionId,
        timestamp: new Date(),
        latitude,
        longitude,
        address: address || null,
        accuracy: accuracy || null
      }
    });

    return NextResponse.json({
      success: true,
      locationCheck
    });
  } catch (error) {
    console.error('Location tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track location' },
      { status: 500 }
    );
  }
}
