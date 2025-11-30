import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';

type RouteParams = {
  params: Promise<{
    leaveId: string;
  }>;
};

const approveLeaveSchema = z.object({
  action: z.enum(['approve', 'reject', 'unapprove']),
  rejectionReason: z.string().optional()
});

export async function POST(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only ADMIN, PLATFORM_ADMIN, and FINANCE can approve/reject
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      userRole !== UserRole.FINANCE
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to approve leave requests' },
        { status: 403 }
      );
    }

    const { leaveId } = await props.params;
    const body = await request.json();
    const { action, rejectionReason } = approveLeaveSchema.parse(body);

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
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

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Validate status based on action
    if (action === 'unapprove') {
      if (leaveRequest.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Only approved leave requests can be unapproved' },
          { status: 400 }
        );
      }
    } else {
      if (leaveRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Only pending leave requests can be approved or rejected' },
          { status: 400 }
        );
      }
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const newStatus =
      action === 'approve'
        ? 'APPROVED'
        : action === 'reject'
          ? 'REJECTED'
          : 'PENDING';

    // Update leave request
    const updateData: any = {
      status: newStatus
    };

    if (action === 'unapprove') {
      // Clear approval info when unapproving
      updateData.approvedById = null;
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
    } else {
      // Set approval info for approve/reject
      updateData.approvedById = session.user.id;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = action === 'reject' ? rejectionReason : null;
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Update leave balance
    const year = new Date(leaveRequest.startDate).getFullYear();

    if (action === 'approve') {
      // Move from pending to used
      await prisma.leaveBalance.upsert({
        where: {
          userId_year_leaveType: {
            userId: leaveRequest.userId,
            year,
            leaveType: leaveRequest.leaveType
          }
        },
        update: {
          totalPending: {
            decrement: leaveRequest.totalDays
          },
          totalUsed: {
            increment: leaveRequest.totalDays
          }
          // Balance stays the same (already decremented when created)
        },
        create: {
          userId: leaveRequest.userId,
          year,
          leaveType: leaveRequest.leaveType,
          totalAllocated: 0,
          totalUsed: leaveRequest.totalDays,
          totalPending: 0,
          balance: -leaveRequest.totalDays
        }
      });
    } else if (action === 'reject') {
      // Rejected - remove from pending, restore balance
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
    } else if (action === 'unapprove') {
      // Unapproved - move from used back to pending
      await prisma.leaveBalance.updateMany({
        where: {
          userId: leaveRequest.userId,
          year,
          leaveType: leaveRequest.leaveType
        },
        data: {
          totalUsed: {
            decrement: leaveRequest.totalDays
          },
          totalPending: {
            increment: leaveRequest.totalDays
          }
          // Balance stays the same
        }
      });
    }

    // Send notification to the employee (only for approve/reject, not unapprove)
    if (action !== 'unapprove') {
      const notification = await prisma.notification.create({
        data: {
          category: 'LEAVE',
          title: `Your leave request has been ${action === 'approve' ? 'approved' : 'rejected'}`,
          body:
            action === 'approve'
              ? `${leaveRequest.leaveType} leave for ${leaveRequest.totalDays} day${leaveRequest.totalDays !== 1 ? 's' : ''}`
              : rejectionReason || 'Your leave request was rejected',
          entityType: 'LEAVE',
          entityId: leaveRequest.id,
          data: {
            type: action === 'approve' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
            leaveId: leaveRequest.id,
            leaveType: leaveRequest.leaveType,
            totalDays: leaveRequest.totalDays,
            rejectionReason: action === 'reject' ? rejectionReason : null
          }
        }
      });

      // Create notification receipt for the employee
      await prisma.notificationReceipt.create({
        data: {
          notificationId: notification.id,
          userId: leaveRequest.userId,
          channel: 'IN_APP'
        }
      });
    }

    return NextResponse.json({ leaveRequest: updatedLeave });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[LEAVES_APPROVE]', error);
    return NextResponse.json(
      { message: 'Failed to process leave request.' },
      { status: 500 }
    );
  }
}
