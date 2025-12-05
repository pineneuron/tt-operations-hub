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

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  remarks: z.string().optional().nullable(),
  status: z.nativeEnum(JobStatus).default(JobStatus.NOT_STARTED),
  priority: z.nativeEnum(JobPriority).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  eventId: z.string().optional().nullable(),
  staffIds: z
    .array(z.string())
    .min(1, 'At least one staff member must be assigned')
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const eventId = searchParams.get('eventId');
    const search = searchParams.get('search');
    const assigneeId = searchParams.get('assigneeId');

    const userRole = session.user.role as UserRole;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {};

    // Role-based filtering
    if (userRole === UserRole.STAFF) {
      // Staff only see jobs they're assigned to
      where.assignees = {
        some: {
          userId: session.user.id
        }
      };
    }
    // ADMIN and PLATFORM_ADMIN see all jobs

    // Apply filters
    if (status) {
      const statusValues = status.split(',').filter(Boolean) as JobStatus[];
      where.status = { in: statusValues };
    }

    if (eventId) {
      where.eventId = eventId;
    }

    if (assigneeId) {
      where.assignees = {
        some: {
          userId: assigneeId
        }
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Priority order mapping: URGENT=4, HIGH=3, MEDIUM=2, LOW=1, null=0
    // Prisma enum ordering is alphabetical (LOW, MEDIUM, HIGH, URGENT),
    // so we need custom sorting to get: URGENT > HIGH > MEDIUM > LOW
    const priorityOrder: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    const [allJobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              title: true
            }
          },
          assignees: {
            select: {
              id: true
            }
          },
          _count: {
            select: {
              assignees: true
            }
          }
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
      }),
      prisma.job.count({ where })
    ]);

    // Sort by priority (custom order), then by dueDate, then by createdAt
    const sortedJobs = allJobs.sort((a, b) => {
      // Priority comparison (descending: higher priority first)
      const aPriority = a.priority ? priorityOrder[a.priority] || 0 : 0;
      const bPriority = b.priority ? priorityOrder[b.priority] || 0 : 0;
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }

      // Due date comparison (ascending: earlier dates first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // Created date comparison (descending: newer first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Apply pagination after sorting
    const jobs = sortedJobs.slice(skip, skip + limit);

    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      remarks: job.remarks,
      status: job.status,
      priority: job.priority,
      dueDate: job.dueDate?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
      eventId: job.eventId,
      eventTitle: job.event?.title || null,
      assigneeCount: job._count.assignees,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    }));

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only ADMIN and PLATFORM_ADMIN can create jobs
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Only ADMIN and PLATFORM_ADMIN can create jobs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    const dueDate = validatedData.dueDate
      ? new Date(validatedData.dueDate)
      : null;

    // Verify all staffIds are valid users with STAFF role
    const staffUsers = await prisma.user.findMany({
      where: {
        id: { in: validatedData.staffIds },
        role: 'STAFF',
        isActive: true
      },
      select: { id: true, email: true }
    });

    const validStaffIds = staffUsers.map((u) => u.id);

    if (validStaffIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid staff members found' },
        { status: 400 }
      );
    }

    // Create job
    const job = await prisma.job.create({
      data: {
        title: validatedData.title,
        remarks: validatedData.remarks || null,
        status: validatedData.status,
        priority: validatedData.priority || null,
        dueDate,
        eventId: validatedData.eventId || null,
        createdById: session.user.id,
        updatedById: session.user.id
      }
    });

    // Add staff assignments
    await prisma.jobAssignment.createMany({
      data: validStaffIds.map((staffId) => ({
        jobId: job.id,
        userId: staffId
      })),
      skipDuplicates: true
    });

    // Create initial job update for job creation
    const statusLabelMap: Record<JobStatus, string> = {
      NOT_STARTED: 'Not Started',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      BLOCKED: 'Blocked',
      COMPLETED: 'Completed'
    };
    const statusLabel = statusLabelMap[job.status] || job.status;

    await prisma.jobUpdate.create({
      data: {
        jobId: job.id,
        createdById: session.user.id,
        type: JobUpdateType.STATUS,
        status: job.status,
        message: `Job created with status: ${statusLabel}`
      }
    });

    // Send notifications to assigned staff
    const notification = await prisma.notification.create({
      data: {
        category: 'JOB',
        title: `New job assigned: ${job.title}`,
        body: job.remarks || 'You have been assigned a new job',
        entityType: 'JOB',
        entityId: job.id,
        data: {
          type: 'JOB_ASSIGNED',
          jobId: job.id,
          jobTitle: job.title
        }
      }
    });

    // Create notification receipts for all assigned staff
    await prisma.notificationReceipt.createMany({
      data: validStaffIds.map((staffId) => ({
        notificationId: notification.id,
        userId: staffId,
        channel: 'IN_APP'
      }))
    });

    // Send FCM push notifications to assigned staff
    await sendPushNotifications(
      validStaffIds,
      {
        title: notification.title,
        body: notification.body || ''
      },
      {
        notificationId: notification.id,
        entityType: 'JOB',
        entityId: job.id,
        url: `/dashboard/jobs`
      }
    );

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[JOBS_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create job.' },
      { status: 500 }
    );
  }
}
