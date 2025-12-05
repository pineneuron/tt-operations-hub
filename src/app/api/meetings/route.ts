import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import {
  MeetingStatus,
  MeetingType,
  MeetingParticipantRole,
  MeetingMediaType,
  RecurrenceFrequency,
  type Prisma
} from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  agenda: z.string().optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional().nullable(),
  meetingLink: z.string().url().optional().nullable(),
  status: z.nativeEnum(MeetingStatus).default(MeetingStatus.SCHEDULED),
  type: z.nativeEnum(MeetingType).default(MeetingType.INTERNAL_MEETING),
  participantIds: z.array(z.string()).optional().default([]),
  isRecurring: z.boolean().default(false),
  recurrence: z
    .object({
      frequency: z.nativeEnum(RecurrenceFrequency),
      interval: z.number().int().positive().default(1),
      endDate: z.string().datetime().nullable().optional(),
      occurrences: z.number().int().positive().nullable().optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
      dayOfMonth: z.number().int().min(1).max(31).nullable().optional()
    })
    .optional()
    .nullable(),
  reminderMinutes: z.array(z.number().int().positive()).default([]),
  attachmentUrls: z.array(z.string().url()).optional().default([])
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
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const filterType = searchParams.get('filterType'); // upcoming | past | today

    const userRole = session.user.role as UserRole;
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingWhereInput = {};

    // Role-based filtering
    if (userRole === UserRole.CLIENT) {
      // Clients only see meetings they're participants in
      where.participants = {
        some: {
          userId: session.user.id
        }
      };
    } else if (
      userRole === UserRole.STAFF ||
      userRole === UserRole.VENDOR_SUPPLIER
    ) {
      // Staff/Vendors see meetings they're participants in
      where.participants = {
        some: {
          userId: session.user.id
        }
      };
    }
    // ADMIN and PLATFORM_ADMIN see all meetings

    // Apply filters
    if (status) {
      const statusValues = status.split(',').filter(Boolean) as MeetingStatus[];
      where.status = { in: statusValues };
    }

    if (type) {
      const typeValues = type.split(',').filter(Boolean) as MeetingType[];
      where.type = { in: typeValues };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { agenda: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (dateFrom || dateTo) {
      where.startTime = {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined
      };
    }

    // Upcoming / Past / Today filter
    if (filterType === 'upcoming') {
      const now = new Date();
      where.startTime = {
        gte: now
      };
    } else if (filterType === 'past') {
      const now = new Date();
      where.startTime = {
        lt: now
      };
    } else if (filterType === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.startTime = {
        gte: today,
        lt: tomorrow
      };
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          participants: {
            select: {
              id: true
            }
          },
          _count: {
            select: {
              participants: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.meeting.count({ where })
    ]);

    const formattedMeetings = meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      agenda: meeting.agenda,
      startTime: meeting.startTime.toISOString(),
      endTime: meeting.endTime.toISOString(),
      location: meeting.location,
      meetingLink: meeting.meetingLink,
      status: meeting.status,
      type: meeting.type,
      organizerId: meeting.organizerId,
      organizerName: meeting.organizer.name,
      organizerEmail: meeting.organizer.email,
      participantCount: meeting._count.participants,
      isRecurring: meeting.isRecurring,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString()
    }));

    return NextResponse.json({
      meetings: formattedMeetings,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
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
    // Only ADMIN, PLATFORM_ADMIN, and STAFF can create meetings
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      userRole !== UserRole.STAFF
    ) {
      return NextResponse.json(
        {
          error: 'Only ADMIN, PLATFORM_ADMIN, and STAFF can create meetings'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createMeetingSchema.parse(body);

    const startTime = new Date(validatedData.startTime);
    const endTime = new Date(validatedData.endTime);

    // Validate times
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        title: validatedData.title,
        agenda: validatedData.agenda || null,
        startTime,
        endTime,
        location: validatedData.location || null,
        meetingLink: validatedData.meetingLink || null,
        status: validatedData.status,
        type: validatedData.type,
        organizerId: session.user.id,
        isRecurring: validatedData.isRecurring
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Add organizer as ORGANIZER participant
    await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId: session.user.id,
        role: MeetingParticipantRole.ORGANIZER
      }
    });

    // Add selected participants
    if (
      validatedData.participantIds &&
      validatedData.participantIds.length > 0
    ) {
      // Verify all participantIds are valid users
      const users = await prisma.user.findMany({
        where: {
          id: { in: validatedData.participantIds },
          isActive: true
        },
        select: { id: true }
      });

      const validUserIds = users.map((u) => u.id);

      if (validUserIds.length > 0) {
        await prisma.meetingParticipant.createMany({
          data: validUserIds.map((userId) => ({
            meetingId: meeting.id,
            userId,
            role: MeetingParticipantRole.ATTENDEE,
            invitedBy: session.user.id
          })),
          skipDuplicates: true
        });
      }
    }

    // Create recurrence if needed
    if (validatedData.isRecurring && validatedData.recurrence) {
      await prisma.meetingRecurrence.create({
        data: {
          meetingId: meeting.id,
          frequency: validatedData.recurrence.frequency,
          interval: validatedData.recurrence.interval,
          endDate: validatedData.recurrence.endDate
            ? new Date(validatedData.recurrence.endDate)
            : null,
          occurrences: validatedData.recurrence.occurrences || null,
          daysOfWeek: validatedData.recurrence.daysOfWeek || [],
          dayOfMonth: validatedData.recurrence.dayOfMonth || null
        }
      });
    }

    // Create reminders
    if (
      validatedData.reminderMinutes &&
      validatedData.reminderMinutes.length > 0
    ) {
      const allParticipantIds = [
        session.user.id,
        ...(validatedData.participantIds || [])
      ];

      await prisma.meetingReminder.createMany({
        data: allParticipantIds.map((userId) => ({
          meetingId: meeting.id,
          userId,
          reminderMinutes: validatedData.reminderMinutes
        })),
        skipDuplicates: true
      });
    }

    // Create meeting media from attachments
    if (
      validatedData.attachmentUrls &&
      validatedData.attachmentUrls.length > 0
    ) {
      await prisma.meetingMedia.createMany({
        data: validatedData.attachmentUrls.map((url) => ({
          meetingId: meeting.id,
          uploadedById: session.user.id,
          type: url.match(/\.(pdf|doc|docx)$/i)
            ? MeetingMediaType.DOCUMENT
            : MeetingMediaType.IMAGE,
          url,
          description: null
        }))
      });
    }

    // Send notifications to participants
    const participantIds = [...(validatedData.participantIds || [])].filter(
      (id) => id !== session.user.id
    );

    if (participantIds.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          category: 'MEETING',
          title: `New meeting: ${meeting.title}`,
          body: `Meeting scheduled on ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}`,
          entityType: 'MEETING',
          entityId: meeting.id,
          data: {
            type: 'MEETING_CREATED',
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          }
        }
      });

      await prisma.notificationReceipt.createMany({
        data: participantIds.map((userId) => ({
          notificationId: notification.id,
          userId,
          channel: 'IN_APP'
        }))
      });

      // Send FCM push notifications
      await sendPushNotifications(
        participantIds,
        {
          title: notification.title,
          body: notification.body || ''
        },
        {
          notificationId: notification.id,
          entityType: 'MEETING',
          entityId: meeting.id,
          url: `/dashboard/meetings/${meeting.id}`
        }
      );
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[MEETINGS_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create meeting.' },
      { status: 500 }
    );
  }
}
