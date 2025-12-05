import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import {
  JobStatus,
  JobPriority,
  JobUpdateType,
  type Prisma
} from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

type RouteParams = {
  params: Promise<{
    jobId: string;
  }>;
};

const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  remarks: z.string().optional().nullable(),
  status: z.nativeEnum(JobStatus).optional(),
  priority: z.nativeEnum(JobPriority).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  eventId: z.string().optional().nullable(),
  staffIds: z.array(z.string()).optional()
});

export async function GET(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await props.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        event: {
          select: {
            id: true,
            title: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updates: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            media: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        media: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            assignees: true,
            updates: true
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access: Staff can only see jobs they're assigned to
    const userRole = session.user.role as UserRole;
    if (userRole === UserRole.STAFF) {
      const isAssigned = job.assignees.some(
        (a) => a.userId === session.user.id
      );
      if (!isAssigned) {
        return NextResponse.json(
          { error: 'You are not assigned to this job' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[JOBS_GET]', error);
    return NextResponse.json(
      { message: 'Failed to fetch job.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    const { jobId } = await props.params;
    const body = await request.json();
    const validatedData = updateJobSchema.parse(body);

    // Get current job data
    const currentJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        assignees: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!currentJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;
    const isAssigned = currentJob.assignees.some(
      (a) => a.userId === session.user.id
    );

    // Staff can only update status (to IN_PROGRESS, IN_REVIEW, COMPLETED)
    // Admin can update everything
    if (!isAdmin) {
      if (!isAssigned) {
        return NextResponse.json(
          { error: 'You are not assigned to this job' },
          { status: 403 }
        );
      }

      // Staff can only update status
      if (
        validatedData.title !== undefined ||
        validatedData.remarks !== undefined ||
        validatedData.priority !== undefined ||
        validatedData.dueDate !== undefined ||
        validatedData.eventId !== undefined ||
        validatedData.staffIds !== undefined
      ) {
        return NextResponse.json(
          { error: 'You can only update job status' },
          { status: 403 }
        );
      }

      // Staff can only set status to IN_PROGRESS, IN_REVIEW, or COMPLETED
      if (
        validatedData.status !== undefined &&
        validatedData.status !== JobStatus.IN_PROGRESS &&
        validatedData.status !== JobStatus.IN_REVIEW &&
        validatedData.status !== JobStatus.COMPLETED
      ) {
        return NextResponse.json(
          {
            error:
              'You can only set status to In Progress, In Review, or Completed'
          },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.remarks !== undefined) {
      updateData.remarks = validatedData.remarks;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      if (validatedData.status === JobStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (currentJob.status === JobStatus.COMPLETED) {
        updateData.completedAt = null;
      }
    }
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority;
    }
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate
        ? new Date(validatedData.dueDate)
        : null;
    }
    if (validatedData.eventId !== undefined) {
      updateData.eventId = validatedData.eventId;
    }

    updateData.updatedById = session.user.id;

    // Get old status for update creation
    const oldStatus = currentJob.status;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Update staff assignments if staffIds is provided (admin only)
    if (validatedData.staffIds !== undefined && isAdmin) {
      const currentStaffIds = currentJob.assignees.map((a) => a.userId);
      const newStaffIds = validatedData.staffIds || [];

      const staffToAdd = newStaffIds.filter(
        (id) => !currentStaffIds.includes(id)
      );
      const staffToRemove = currentStaffIds.filter(
        (id) => !newStaffIds.includes(id)
      );

      if (staffToRemove.length > 0) {
        await prisma.jobAssignment.deleteMany({
          where: {
            jobId,
            userId: { in: staffToRemove }
          }
        });
      }

      if (staffToAdd.length > 0) {
        const staffUsers = await prisma.user.findMany({
          where: {
            id: { in: staffToAdd },
            role: 'STAFF',
            isActive: true
          },
          select: { id: true }
        });

        const validStaffIds = staffUsers.map((u) => u.id);

        if (validStaffIds.length > 0) {
          await prisma.jobAssignment.createMany({
            data: validStaffIds.map((staffId) => ({
              jobId,
              userId: staffId
            })),
            skipDuplicates: true
          });
        }
      }
    }

    // Create job update if status changed
    if (
      updateData.status !== undefined &&
      oldStatus !== null &&
      updateData.status !== oldStatus
    ) {
      const statusLabelMap: Record<JobStatus, string> = {
        NOT_STARTED: 'Not Started',
        IN_PROGRESS: 'In Progress',
        IN_REVIEW: 'In Review',
        BLOCKED: 'Blocked',
        COMPLETED: 'Completed'
      };
      const oldStatusLabel =
        statusLabelMap[oldStatus as JobStatus] || oldStatus;
      const newStatusLabel =
        statusLabelMap[updateData.status as JobStatus] || updateData.status;

      await prisma.jobUpdate.create({
        data: {
          jobId,
          createdById: session.user.id,
          type: JobUpdateType.STATUS,
          status: updateData.status as JobStatus,
          message: `Status changed from ${oldStatusLabel} to ${newStatusLabel}`
        }
      });

      // Send notifications to assigned staff and admins
      const assigneeIds = job.assignees.map((a) => a.userId);
      const adminUsers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'PLATFORM_ADMIN'] },
          isActive: true
        },
        select: { id: true }
      });
      const adminIds = adminUsers.map((u) => u.id);

      const notificationTargets = Array.from(
        new Set(
          [...assigneeIds, ...adminIds].filter((id) => id !== session.user.id)
        )
      );

      if (notificationTargets.length > 0) {
        const notification = await prisma.notification.create({
          data: {
            category: 'JOB',
            title: `Job status updated: ${job.title}`,
            body: `Status changed from ${oldStatusLabel} to ${newStatusLabel}`,
            entityType: 'JOB',
            entityId: jobId,
            data: {
              type: 'JOB_STATUS_CHANGED',
              jobId,
              jobTitle: job.title,
              oldStatus,
              newStatus: updateData.status
            }
          }
        });

        await prisma.notificationReceipt.createMany({
          data: notificationTargets.map((userId) => ({
            notificationId: notification.id,
            userId,
            channel: 'IN_APP'
          }))
        });

        await sendPushNotifications(
          notificationTargets,
          {
            title: notification.title,
            body: notification.body || ''
          },
          {
            notificationId: notification.id,
            entityType: 'JOB',
            entityId: jobId,
            url: `/dashboard/jobs/${jobId}`
          }
        );
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[JOBS_PATCH]', error);
    return NextResponse.json(
      { message: 'Failed to update job.' },
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

    const userRole = session.user.role as UserRole;
    // Only ADMIN and PLATFORM_ADMIN can delete jobs
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Only ADMIN and PLATFORM_ADMIN can delete jobs' },
        { status: 403 }
      );
    }

    const { jobId } = await props.params;

    await prisma.job.delete({
      where: { id: jobId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[JOBS_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to delete job.' },
      { status: 500 }
    );
  }
}
