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
  RecurrenceFrequency
} from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

type RouteParams = {
  params: Promise<{
    meetingId: string;
  }>;
};

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  agenda: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional().nullable(),
  meetingLink: z.string().url().optional().nullable(),
  status: z.nativeEnum(MeetingStatus).optional(),
  type: z.nativeEnum(MeetingType).optional(),
  participantIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
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
  reminderMinutes: z.array(z.number().int().positive()).optional(),
  attachmentUrls: z.array(z.string().url()).optional()
});

export async function GET(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await props.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        notes: {
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
          where: {
            noteId: null
          },
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
        recurrence: true,
        reminders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            participants: true,
            notes: true,
            media: true
          }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check access permissions
    const userRole = session.user.role as UserRole;
    const isParticipant = meeting.participants.some(
      (p) => p.userId === session.user.id
    );
    const isOrganizer = meeting.organizerId === session.user.id;

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isParticipant
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await props.params;

    // Check if meeting exists and user has permission
    const existingMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: true
      }
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;
    const isOrganizer = existingMeeting.organizerId === session.user.id;
    const isParticipant = existingMeeting.participants.some(
      (p) => p.userId === session.user.id
    );

    // Only organizer, ADMIN, or PLATFORM_ADMIN can update
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isOrganizer
    ) {
      return NextResponse.json(
        { error: 'Only organizer can update meeting' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateMeetingSchema.parse(body);

    // Validate times if provided
    if (validatedData.startTime && validatedData.endTime) {
      const startTime = new Date(validatedData.startTime);
      const endTime = new Date(validatedData.endTime);
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    // Update meeting
    const updateData: any = {};
    if (validatedData.title !== undefined)
      updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.agenda !== undefined)
      updateData.agenda = validatedData.agenda;
    if (validatedData.startTime !== undefined)
      updateData.startTime = new Date(validatedData.startTime);
    if (validatedData.endTime !== undefined)
      updateData.endTime = new Date(validatedData.endTime);
    if (validatedData.location !== undefined)
      updateData.location = validatedData.location;
    if (validatedData.meetingLink !== undefined)
      updateData.meetingLink = validatedData.meetingLink;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.isRecurring !== undefined)
      updateData.isRecurring = validatedData.isRecurring;

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
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

    // Update participants if provided
    if (validatedData.participantIds !== undefined) {
      // Remove all existing participants except organizer
      await prisma.meetingParticipant.deleteMany({
        where: {
          meetingId,
          role: MeetingParticipantRole.ATTENDEE
        }
      });

      // Add new participants
      if (validatedData.participantIds.length > 0) {
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
              meetingId,
              userId,
              role: MeetingParticipantRole.ATTENDEE,
              invitedBy: session.user.id
            })),
            skipDuplicates: true
          });
        }
      }
    }

    // Update recurrence if provided
    if (validatedData.recurrence !== undefined) {
      if (validatedData.recurrence === null) {
        // Delete recurrence
        await prisma.meetingRecurrence.deleteMany({
          where: { meetingId }
        });
      } else if (validatedData.isRecurring) {
        // Update or create recurrence
        await prisma.meetingRecurrence.upsert({
          where: { meetingId },
          create: {
            meetingId,
            frequency: validatedData.recurrence.frequency,
            interval: validatedData.recurrence.interval,
            endDate: validatedData.recurrence.endDate
              ? new Date(validatedData.recurrence.endDate)
              : null,
            occurrences: validatedData.recurrence.occurrences || null,
            daysOfWeek: validatedData.recurrence.daysOfWeek || [],
            dayOfMonth: validatedData.recurrence.dayOfMonth || null
          },
          update: {
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
    }

    // Update reminders if provided
    if (validatedData.reminderMinutes !== undefined) {
      // Get all participant IDs
      const participants = await prisma.meetingParticipant.findMany({
        where: { meetingId },
        select: { userId: true }
      });

      const participantIds = participants.map((p) => p.userId);

      // Delete existing reminders
      await prisma.meetingReminder.deleteMany({
        where: { meetingId }
      });

      // Create new reminders
      if (
        validatedData.reminderMinutes.length > 0 &&
        participantIds.length > 0
      ) {
        await prisma.meetingReminder.createMany({
          data: participantIds.flatMap((userId) =>
            validatedData.reminderMinutes!.map((minutes) => ({
              meetingId,
              userId,
              reminderMinutes: [minutes]
            }))
          ),
          skipDuplicates: true
        });
      }
    }

    // Handle attachments if provided
    if (validatedData.attachmentUrls !== undefined) {
      // Delete existing meeting-level media (not linked to notes)
      await prisma.meetingMedia.deleteMany({
        where: {
          meetingId,
          noteId: null
        }
      });

      // Create new meeting media from attachments
      if (validatedData.attachmentUrls.length > 0) {
        await prisma.meetingMedia.createMany({
          data: validatedData.attachmentUrls.map((url) => ({
            meetingId,
            uploadedById: session.user.id,
            type: url.match(/\.(pdf|doc|docx)$/i)
              ? MeetingMediaType.DOCUMENT
              : MeetingMediaType.IMAGE,
            url,
            description: null
          }))
        });
      }
    }

    // Send notification about update
    const participants = await prisma.meetingParticipant.findMany({
      where: { meetingId },
      select: { userId: true }
    });

    const participantIds = participants
      .map((p) => p.userId)
      .filter((id) => id !== session.user.id);

    if (participantIds.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          category: 'MEETING',
          title: `Meeting updated: ${meeting.title}`,
          body: 'Meeting details have been updated',
          entityType: 'MEETING',
          entityId: meeting.id,
          createdById: session.user.id
        }
      });

      await prisma.notificationReceipt.createMany({
        data: participantIds.map((userId) => ({
          notificationId: notification.id,
          userId,
          channel: 'IN_APP'
        }))
      });

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

    return NextResponse.json({ meeting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[MEETINGS_PUT]', error);
    return NextResponse.json(
      { message: 'Failed to update meeting.' },
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

    const { meetingId } = await props.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;
    const isOrganizer = meeting.organizerId === session.user.id;

    // Only organizer, ADMIN, or PLATFORM_ADMIN can delete
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isOrganizer
    ) {
      return NextResponse.json(
        { error: 'Only organizer can delete meeting' },
        { status: 403 }
      );
    }

    // Delete meeting (cascade will handle related records)
    await prisma.meeting.delete({
      where: { id: meetingId }
    });

    return NextResponse.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('[MEETINGS_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to delete meeting.' },
      { status: 500 }
    );
  }
}
