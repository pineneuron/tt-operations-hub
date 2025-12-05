import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { JobStatus, JobUpdateType } from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

type RouteParams = {
  params: Promise<{
    jobId: string;
  }>;
};

const createUpdateSchema = z.object({
  type: z.nativeEnum(JobUpdateType),
  status: z.nativeEnum(JobStatus).optional().nullable(),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
  mediaIds: z.array(z.string()).optional().default([])
});

export async function GET(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await props.params;

    const updates = await prisma.jobUpdate.findMany({
      where: { jobId },
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
    });

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('[JOB_UPDATES_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch job updates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await props.params;
    const body = await request.json();
    const validatedData = createUpdateSchema.parse(body);

    // Check if user is assigned to this job or is admin
    const userRole = session.user.role as UserRole;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

    if (!isAdmin) {
      const assignment = await prisma.jobAssignment.findUnique({
        where: {
          jobId_userId: {
            jobId,
            userId: session.user.id
          }
        }
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this job' },
          { status: 403 }
        );
      }
    }

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
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

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create update
    const update = await prisma.jobUpdate.create({
      data: {
        jobId,
        createdById: session.user.id,
        type: validatedData.type,
        status: validatedData.status || null,
        message: validatedData.message,
        metadata: validatedData.metadata || undefined
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // Link media to update if provided
    if (validatedData.mediaIds && validatedData.mediaIds.length > 0) {
      await prisma.jobMedia.updateMany({
        where: {
          id: { in: validatedData.mediaIds },
          jobId,
          updateId: null // Only link media that isn't already linked
        },
        data: {
          updateId: update.id
        }
      });
    }

    // Update job status if provided
    if (validatedData.status) {
      const updateData: any = {
        status: validatedData.status,
        updatedById: session.user.id
      };

      if (validatedData.status === JobStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (job.status === JobStatus.COMPLETED) {
        updateData.completedAt = null;
      }

      await prisma.job.update({
        where: { id: jobId },
        data: updateData
      });
    }

    // Get updated update with media
    const updateWithMedia = await prisma.jobUpdate.findUnique({
      where: { id: update.id },
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
      }
    });

    // Send notifications to:
    // 1. All assigned staff
    // 2. Admins
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
          title: `Update on ${job.title}`,
          body: `${session.user.name || session.user.email}: ${validatedData.message}`,
          entityType: 'JOB',
          entityId: jobId,
          data: {
            type: 'JOB_UPDATE',
            jobId,
            jobTitle: job.title,
            updateId: update.id,
            updateType: validatedData.type
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

    return NextResponse.json({ update: updateWithMedia }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[JOB_UPDATES_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create job update.' },
      { status: 500 }
    );
  }
}
