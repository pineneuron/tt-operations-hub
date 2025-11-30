import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import type { Prisma, WorkLocation, AttendanceStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only STAFF, FINANCE, ADMIN, and PLATFORM_ADMIN can access
    if (
      userRole !== UserRole.STAFF &&
      userRole !== UserRole.FINANCE &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const workLocation = searchParams.get('workLocation');
    const status = searchParams.get('status');

    const where: Prisma.AttendanceSessionWhereInput = {};

    // If user is STAFF or FINANCE, only show their own attendance
    if (userRole === UserRole.STAFF || userRole === UserRole.FINANCE) {
      where.userId = session.user.id;
    } else if (userId) {
      // Admin can filter by user
      where.userId = userId;
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        const [year, month, day] = dateFrom.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        startDate.setHours(0, 0, 0, 0);
        where.date.gte = startDate;
      }
      if (dateTo) {
        const [year, month, day] = dateTo.split('-').map(Number);
        const endDate = new Date(year, month - 1, day);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Work location filter
    if (workLocation) {
      where.workLocation = workLocation as WorkLocation;
    }

    // Status filter
    if (status) {
      const statusValues = status.split(',').filter(Boolean);
      if (statusValues.length > 0) {
        where.status = {
          in: statusValues as AttendanceStatus[]
        };
      }
    }

    const [sessions, total] = await Promise.all([
      prisma.attendanceSession.findMany({
        where,
        orderBy: { checkInTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.attendanceSession.count({ where })
    ]);

    return NextResponse.json({
      sessions,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    );
  }
}
