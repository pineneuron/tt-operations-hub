import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import type { Prisma, WorkLocation, AttendanceStatus } from '@prisma/client';

// Helper function to format date in Asia/Kathmandu timezone (YYYY-MM-DD)
function formatDateInKathmandu(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

// Helper function to format datetime in Asia/Kathmandu timezone (YYYY-MM-DD HH:MM:SS AM/PM)
function formatDateTimeInKathmandu(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  const second = parts.find((p) => p.type === 'second')?.value;
  const dayPeriod = parts
    .find((p) => p.type === 'dayPeriod')
    ?.value?.toUpperCase();

  return `${year}-${month}-${day} ${hour}:${minute}:${second} ${dayPeriod}`;
}

// Helper function to format hours worked as hours and minutes (e.g., "8 hours 30 minutes")
function formatHoursWorked(hours: number): string {
  const totalHours = Math.floor(hours);
  const minutes = Math.round((hours - totalHours) * 60);

  if (totalHours > 0 && minutes > 0) {
    return `${totalHours} hour${totalHours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (totalHours > 0) {
    return `${totalHours} hour${totalHours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return '0 minutes';
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only ADMIN and PLATFORM_ADMIN can export
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('name'); // Employee search filter
    const datePreset = searchParams.get('datePreset');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const workLocation = searchParams.get('workLocation');
    const status = searchParams.get('status');

    const where: Prisma.AttendanceSessionWhereInput = {};

    // Employee search filter
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Date range filtering - handle datePreset similar to listing page
    if (datePreset || dateFrom || dateTo) {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (datePreset === 'today') {
        const today = new Date();
        startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        endDate.setHours(23, 59, 59, 999);
      } else if (datePreset === 'this-week') {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sunday
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        startDate = weekStart;
        endDate = weekEnd;
      } else if (datePreset === 'this-month') {
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      } else if (datePreset === 'this-year') {
        const today = new Date();
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      } else if (datePreset === 'last-month') {
        const today = new Date();
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        endDate = new Date(
          lastMonth.getFullYear(),
          lastMonth.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      } else if (datePreset && /^\d{4}-\d{2}$/.test(datePreset)) {
        // Handle month presets like "2024-01" (YYYY-MM format)
        const [year, month] = datePreset.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else if (dateFrom || dateTo) {
        // Custom date range - parse dates in local timezone to avoid timezone issues
        if (dateFrom) {
          const [year, month, day] = dateFrom.split('-').map(Number);
          startDate = new Date(year, month - 1, day);
          startDate.setHours(0, 0, 0, 0);
        }
        if (dateTo) {
          const [year, month, day] = dateTo.split('-').map(Number);
          endDate = new Date(year, month - 1, day);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }
    }

    // Work location filter - handle multiple values (comma-separated)
    if (workLocation) {
      const locationValues = workLocation.split(',').filter(Boolean);
      if (locationValues.length > 0) {
        where.workLocation = {
          in: locationValues as WorkLocation[]
        };
      }
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

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { checkInTime: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Convert to CSV
    const headers = [
      'Employee Name',
      'Employee Email',
      'Date',
      'Work Location',
      'Status',
      'Check-In Time',
      'Check-Out Time',
      'Total Hours',
      'Is Late',
      'Late Minutes',
      'Late Reason',
      'Check-In Location',
      'Check-Out Location',
      'Auto Checked Out',
      'Created At'
    ];

    const rows = sessions.map((session) => [
      session.user.name || 'Unnamed user',
      session.user.email,
      formatDateInKathmandu(session.date),
      session.workLocation,
      session.status,
      formatDateTimeInKathmandu(session.checkInTime),
      session.checkOutTime
        ? formatDateTimeInKathmandu(session.checkOutTime)
        : '',
      session.totalHours ? formatHoursWorked(session.totalHours) : '',
      session.isLate ? 'Yes' : 'No',
      session.lateMinutes?.toString() || '',
      session.lateReason || '',
      session.checkInLocationAddress || '',
      session.checkOutLocationAddress || '',
      session.autoCheckedOut ? 'Yes' : 'No',
      formatDateTimeInKathmandu(session.createdAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance-history-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export attendance history error:', error);
    return NextResponse.json(
      { error: 'Failed to export attendance history' },
      { status: 500 }
    );
  }
}
