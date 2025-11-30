import { AttendanceTable } from '@/features/attendance/components/attendance-tables';
import { columns } from '@/features/attendance/components/attendance-tables/columns';
import type { AttendanceHistoryItem } from '@/features/attendance/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { WorkLocation, AttendanceStatus, type Prisma } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export default async function AttendanceListingPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;

  // Only STAFF, FINANCE, ADMIN, and PLATFORM_ADMIN can access
  if (
    userRole !== UserRole.STAFF &&
    userRole !== UserRole.FINANCE &&
    userRole !== UserRole.ADMIN &&
    userRole !== UserRole.PLATFORM_ADMIN
  ) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-muted-foreground'>
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const search = searchParamsCache.get('name');
  const workLocationFilter = searchParamsCache.get('workLocation');
  const statusFilter = searchParamsCache.get('status');
  const datePreset = searchParamsCache.get('datePreset');
  const dateFrom = searchParamsCache.get('dateFrom');
  const dateTo = searchParamsCache.get('dateTo');

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceSessionWhereInput = {};

  // If user is STAFF or FINANCE, only show their own attendance
  if (userRole === UserRole.STAFF || userRole === UserRole.FINANCE) {
    where.userId = session?.user?.id;
  }

  // Employee search filter - only for ADMIN and PLATFORM_ADMIN
  const canUseEmployeeSearch =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  if (canUseEmployeeSearch && search) {
    where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  // Work location filter
  if (workLocationFilter) {
    const locationValues = workLocationFilter.split(',').filter(Boolean);
    if (locationValues.length > 0) {
      where.workLocation = {
        in: locationValues as WorkLocation[]
      };
    }
  }

  // Status filter
  if (statusFilter) {
    const statusValues = statusFilter.split(',').filter(Boolean);
    if (statusValues.length > 0) {
      where.status = {
        in: statusValues as AttendanceStatus[]
      };
    }
  }

  // Date range filtering - only for ADMIN and PLATFORM_ADMIN
  const canUseDateFilter =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  if (canUseDateFilter && (datePreset || dateFrom || dateTo)) {
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
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
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

  const [sessions, totalSessions] = await Promise.all([
    prisma.attendanceSession.findMany({
      where,
      orderBy: { checkInTime: 'desc' },
      skip,
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

  const tableData: AttendanceHistoryItem[] = sessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    userName: session.user.name,
    userEmail: session.user.email,
    date: session.date.toISOString(),
    workLocation: session.workLocation,
    status: session.status,
    flags: session.flags,
    checkInTime: session.checkInTime.toISOString(),
    expectedCheckInTime: session.expectedCheckInTime?.toISOString() ?? null,
    checkOutTime: session.checkOutTime?.toISOString() ?? null,
    totalHours: session.totalHours,
    isLate: session.isLate,
    lateMinutes: session.lateMinutes,
    lateReason: session.lateReason,
    checkInLocationAddress: session.checkInLocationAddress,
    checkOutLocationAddress: session.checkOutLocationAddress,
    checkInNotes: session.checkInNotes,
    checkOutNotes: session.checkOutNotes,
    autoCheckedOut: session.autoCheckedOut,
    createdAt: session.createdAt.toISOString()
  }));

  return (
    <AttendanceTable
      data={tableData}
      totalItems={totalSessions}
      columns={columns}
      userRole={userRole}
    />
  );
}
