import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { LeaveType, HalfDayType } from '@prisma/client';
import { UserRole } from '@/types/user-role';

type RouteParams = {
  params: Promise<{
    leaveId: string;
  }>;
};

const updateLeaveSchema = z.object({
  leaveType: z.nativeEnum(LeaveType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isHalfDay: z.boolean().optional(),
  halfDayType: z.nativeEnum(HalfDayType).optional().nullable(),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters.')
    .optional(),
  notes: z.string().optional().nullable()
});

// Helper function to calculate working days
async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  isHalfDay: boolean
): Promise<number> {
  if (isHalfDay) {
    return 0.5;
  }

  const holidays = await prisma.nepaliHoliday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().split('T')[0])
  );

  let workingDays = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];

    if (dayOfWeek !== 6 && !holidayDates.has(dateString)) {
      workingDays++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

export async function PATCH(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leaveId } = await props.params;

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveId }
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Only the owner can update, and only if status is PENDING
    if (leaveRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own leave requests' },
        { status: 403 }
      );
    }

    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be updated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateLeaveSchema.parse(body);

    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : leaveRequest.startDate;
    const endDate = validatedData.endDate
      ? new Date(validatedData.endDate)
      : leaveRequest.endDate;
    const isHalfDay = validatedData.isHalfDay ?? leaveRequest.isHalfDay;

    // Validate dates
    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after or equal to start date' },
        { status: 400 }
      );
    }

    if (isHalfDay && startDate.toDateString() !== endDate.toDateString()) {
      return NextResponse.json(
        { error: 'For half day leave, start and end date must be the same' },
        { status: 400 }
      );
    }

    // Calculate total days
    const totalDays = await calculateWorkingDays(startDate, endDate, isHalfDay);

    // Update leave request
    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        leaveType: validatedData.leaveType,
        startDate,
        endDate,
        isHalfDay,
        halfDayType: isHalfDay ? validatedData.halfDayType : null,
        reason: validatedData.reason?.trim() ?? leaveRequest.reason,
        notes: validatedData.notes?.trim() || null,
        totalDays
      },
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

    return NextResponse.json({ leaveRequest: updatedLeave });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[LEAVES_PATCH]', error);
    return NextResponse.json(
      { message: 'Failed to update leave request.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leaveId } = await props.params;

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveId }
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const userRole = session.user.role as UserRole;
    // Only the owner or ADMIN/PLATFORM_ADMIN can cancel, and only if status is PENDING
    const isOwner = leaveRequest.userId === session.user.id;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only cancel your own leave requests' },
        { status: 403 }
      );
    }

    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be cancelled' },
        { status: 400 }
      );
    }

    // Update status to CANCELLED instead of deleting
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: 'CANCELLED'
      }
    });

    // Update leave balance - remove from pending
    const year = new Date(leaveRequest.startDate).getFullYear();
    await prisma.leaveBalance.updateMany({
      where: {
        userId: leaveRequest.userId,
        year,
        leaveType: leaveRequest.leaveType
      },
      data: {
        totalPending: {
          decrement: leaveRequest.totalDays
        },
        balance: {
          increment: leaveRequest.totalDays
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LEAVES_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to cancel leave request.' },
      { status: 500 }
    );
  }
}
