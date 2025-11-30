import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { LeaveType, HalfDayType } from '@prisma/client';
import { UserRole } from '@/types/user-role';

const createLeaveSchema = z.object({
  leaveType: z.nativeEnum(LeaveType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isHalfDay: z.boolean().default(false),
  halfDayType: z.nativeEnum(HalfDayType).optional().nullable(),
  reason: z.string().min(10, 'Reason must be at least 10 characters.'),
  notes: z.string().optional().nullable()
});

// Helper function to calculate working days excluding weekends (Saturday) and holidays
async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  isHalfDay: boolean
): Promise<number> {
  if (isHalfDay) {
    return 0.5;
  }

  // Get all Nepali holidays in the date range
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
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const dateString = currentDate.toISOString().split('T')[0];

    // Exclude Saturday (6) and holidays
    if (dayOfWeek !== 6 && !holidayDates.has(dateString)) {
      workingDays++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only STAFF and FINANCE can create leave requests
    if (userRole !== UserRole.STAFF && userRole !== UserRole.FINANCE) {
      return NextResponse.json(
        { error: 'Only STAFF and FINANCE can create leave requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createLeaveSchema.parse(body);

    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    // Validate dates
    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after or equal to start date' },
        { status: 400 }
      );
    }

    if (validatedData.isHalfDay) {
      if (startDate.toDateString() !== endDate.toDateString()) {
        return NextResponse.json(
          { error: 'For half day leave, start and end date must be the same' },
          { status: 400 }
        );
      }
      if (!validatedData.halfDayType) {
        return NextResponse.json(
          { error: 'Half day type is required for half day leave' },
          { status: 400 }
        );
      }
    }

    // Calculate total days
    const totalDays = await calculateWorkingDays(
      startDate,
      endDate,
      validatedData.isHalfDay
    );

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        leaveType: validatedData.leaveType,
        startDate,
        endDate,
        isHalfDay: validatedData.isHalfDay,
        halfDayType: validatedData.isHalfDay ? validatedData.halfDayType : null,
        reason: validatedData.reason.trim(),
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

    // Update leave balance - add to pending
    const year = startDate.getFullYear();
    await prisma.leaveBalance.upsert({
      where: {
        userId_year_leaveType: {
          userId: session.user.id,
          year,
          leaveType: validatedData.leaveType
        }
      },
      update: {
        totalPending: {
          increment: totalDays
        },
        balance: {
          decrement: totalDays
        }
      },
      create: {
        userId: session.user.id,
        year,
        leaveType: validatedData.leaveType,
        totalAllocated: 0,
        totalUsed: 0,
        totalPending: totalDays,
        balance: -totalDays
      }
    });

    // Send notification to ADMIN and PLATFORM_ADMIN
    const approvers = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.PLATFORM_ADMIN, UserRole.ADMIN]
        },
        isActive: true
      }
    });

    if (approvers.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          category: 'LEAVE',
          title: `${session.user.name || session.user.email} requested leave`,
          body: `${validatedData.leaveType} leave for ${totalDays} day${totalDays !== 1 ? 's' : ''}`,
          entityType: 'LEAVE',
          entityId: leaveRequest.id,
          data: {
            type: 'LEAVE_REQUEST',
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            leaveType: validatedData.leaveType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays
          }
        }
      });

      // Create notification receipts for all approvers
      await prisma.notificationReceipt.createMany({
        data: approvers.map((approver) => ({
          notificationId: notification.id,
          userId: approver.id,
          channel: 'IN_APP'
        }))
      });

      // Send FCM push notifications to approvers
      const { sendPushNotifications } = await import('@/lib/notifications');
      await sendPushNotifications(
        approvers.map((approver) => approver.id),
        {
          title: notification.title,
          body: notification.body || ''
        },
        {
          notificationId: notification.id,
          entityType: notification.entityType || 'LEAVE',
          entityId: notification.entityId || '',
          url: '/dashboard/leaves'
        }
      );
    }

    return NextResponse.json({ leaveRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[LEAVES_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create leave request.' },
      { status: 500 }
    );
  }
}
