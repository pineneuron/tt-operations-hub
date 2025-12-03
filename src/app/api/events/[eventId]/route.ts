import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { EventStatus, EventUpdateType } from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

type RouteParams = {
  params: Promise<{
    eventId: string;
  }>;
};

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  clientId: z.string().min(1).optional(),
  venue: z.string().optional().nullable(),
  featuredImageUrl: z.string().url().optional().nullable(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  staffIds: z.array(z.string()).optional()
});

export async function GET(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await props.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: {
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
        updates: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            media: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        reports: {
          include: {
            submittedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            attachments: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        media: {
          where: {
            updateId: null,
            reportId: null
          },
          include: {
            uploadedBy: {
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
            updates: true,
            reports: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('[EVENTS_GET]', error);
    return NextResponse.json(
      { message: 'Failed to fetch event.' },
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
    // Only ADMIN and PLATFORM_ADMIN can update events
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Only ADMIN and PLATFORM_ADMIN can update events' },
        { status: 403 }
      );
    }

    const { eventId } = await props.params;
    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    const updateData: any = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.clientId !== undefined) {
      updateData.clientId = validatedData.clientId;
    }
    if (validatedData.venue !== undefined) {
      updateData.venue = validatedData.venue;
    }
    if (validatedData.featuredImageUrl !== undefined) {
      updateData.featuredImageUrl = validatedData.featuredImageUrl;
    }
    if (validatedData.startDate !== undefined) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate !== undefined) {
      updateData.endDate = new Date(validatedData.endDate);
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    // Validate dates if both are provided
    if (updateData.startDate && updateData.endDate) {
      if (updateData.endDate < updateData.startDate) {
        return NextResponse.json(
          { error: 'End date must be after or equal to start date' },
          { status: 400 }
        );
      }
    }

    // Get current event data if status or dates are being updated
    let oldStatus: EventStatus | null = null;
    let oldStartDate: Date | null = null;
    let oldEndDate: Date | null = null;

    if (
      updateData.status !== undefined ||
      updateData.startDate !== undefined ||
      updateData.endDate !== undefined
    ) {
      const currentEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          status: true,
          startDate: true,
          endDate: true
        }
      });
      if (currentEvent) {
        oldStatus = currentEvent.status;
        oldStartDate = currentEvent.startDate;
        oldEndDate = currentEvent.endDate;
      }
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: {
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

    // Update staff participants if staffIds is provided
    if (validatedData.staffIds !== undefined) {
      // Get current staff participants (excluding coordinator and client)
      const currentStaffParticipants = await prisma.eventParticipant.findMany({
        where: {
          eventId,
          role: 'STAFF'
        },
        select: { userId: true }
      });

      const currentStaffIds = currentStaffParticipants.map((p) => p.userId);
      const newStaffIds = validatedData.staffIds || [];

      // Find staff to add and remove
      const staffToAdd = newStaffIds.filter(
        (id) => !currentStaffIds.includes(id)
      );
      const staffToRemove = currentStaffIds.filter(
        (id) => !newStaffIds.includes(id)
      );

      // Remove staff that are no longer assigned
      if (staffToRemove.length > 0) {
        await prisma.eventParticipant.deleteMany({
          where: {
            eventId,
            userId: { in: staffToRemove },
            role: 'STAFF'
          }
        });
      }

      // Add new staff participants
      if (staffToAdd.length > 0) {
        // Verify all staffIds are valid users with STAFF role
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
          await prisma.eventParticipant.createMany({
            data: validStaffIds.map((staffId) => ({
              eventId,
              userId: staffId,
              role: 'STAFF',
              invitedBy: session.user.id
            })),
            skipDuplicates: true
          });
        }
      }
    }

    // Create event update if status changed
    if (
      updateData.status !== undefined &&
      oldStatus !== null &&
      updateData.status !== oldStatus
    ) {
      const statusLabelMap: Record<EventStatus, string> = {
        SCHEDULED: 'Scheduled',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled'
      };
      const oldStatusLabel =
        statusLabelMap[oldStatus as EventStatus] || oldStatus;
      const newStatusLabel =
        statusLabelMap[updateData.status as EventStatus] || updateData.status;
      const updateMessage = `Status changed from ${oldStatusLabel} to ${newStatusLabel}`;

      const update = await prisma.eventUpdate.create({
        data: {
          eventId,
          createdById: session.user.id,
          type: EventUpdateType.STATUS,
          status: updateData.status,
          message: updateMessage
        }
      });

      // Get user name for notification
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true }
      });
      const userName = user?.name || user?.email || 'Admin';

      // Send notifications for status change
      const notificationTargets = [
        event.clientId,
        ...event.participants
          .filter((p) => p.role === 'COORDINATOR' || p.role === 'STAFF')
          .map((p) => p.userId)
      ].filter((id) => id !== session.user.id);

      const uniqueTargets = Array.from(new Set(notificationTargets));

      if (uniqueTargets.length > 0) {
        const notification = await prisma.notification.create({
          data: {
            category: 'EVENT',
            title: `Update on ${event.title}`,
            body: `${userName}: ${updateMessage}`,
            entityType: 'EVENT',
            entityId: eventId,
            data: {
              type: 'EVENT_UPDATE',
              eventId,
              eventTitle: event.title,
              updateId: update.id,
              updateType: EventUpdateType.STATUS
            }
          }
        });

        await prisma.notificationReceipt.createMany({
          data: uniqueTargets.map((userId) => ({
            notificationId: notification.id,
            userId,
            channel: 'IN_APP'
          }))
        });

        await sendPushNotifications(
          uniqueTargets,
          {
            title: notification.title,
            body: notification.body || ''
          },
          {
            notificationId: notification.id,
            entityType: 'EVENT',
            entityId: eventId,
            url: `/dashboard/events/${eventId}`
          }
        );
      }
    }

    // Create event update if dates changed
    const startDateChanged =
      updateData.startDate !== undefined &&
      oldStartDate !== null &&
      event.startDate.getTime() !== oldStartDate.getTime();

    const endDateChanged =
      updateData.endDate !== undefined &&
      oldEndDate !== null &&
      event.endDate.getTime() !== oldEndDate.getTime();

    if (startDateChanged || endDateChanged) {
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      let message = 'Event dates updated: ';
      const changes: string[] = [];

      if (startDateChanged && oldStartDate) {
        changes.push(
          `Start date from ${formatDate(oldStartDate)} to ${formatDate(event.startDate)}`
        );
      }
      if (endDateChanged && oldEndDate) {
        changes.push(
          `End date from ${formatDate(oldEndDate)} to ${formatDate(event.endDate)}`
        );
      }

      message += changes.join(', ');

      const update = await prisma.eventUpdate.create({
        data: {
          eventId,
          createdById: session.user.id,
          type: EventUpdateType.STATUS,
          status: event.status,
          message
        }
      });

      // Get user name for notification
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true }
      });
      const userName = user?.name || user?.email || 'Admin';

      // Send notifications for date change
      const notificationTargets = [
        event.clientId,
        ...event.participants
          .filter((p) => p.role === 'COORDINATOR' || p.role === 'STAFF')
          .map((p) => p.userId)
      ].filter((id) => id !== session.user.id);

      const uniqueTargets = Array.from(new Set(notificationTargets));

      if (uniqueTargets.length > 0) {
        const notification = await prisma.notification.create({
          data: {
            category: 'EVENT',
            title: `Update on ${event.title}`,
            body: `${userName}: ${message}`,
            entityType: 'EVENT',
            entityId: eventId,
            data: {
              type: 'EVENT_UPDATE',
              eventId,
              eventTitle: event.title,
              updateId: update.id,
              updateType: EventUpdateType.STATUS
            }
          }
        });

        await prisma.notificationReceipt.createMany({
          data: uniqueTargets.map((userId) => ({
            notificationId: notification.id,
            userId,
            channel: 'IN_APP'
          }))
        });

        await sendPushNotifications(
          uniqueTargets,
          {
            title: notification.title,
            body: notification.body || ''
          },
          {
            notificationId: notification.id,
            entityType: 'EVENT',
            entityId: eventId,
            url: `/dashboard/events/${eventId}`
          }
        );
      }
    }

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[EVENTS_PATCH]', error);
    return NextResponse.json(
      { message: 'Failed to update event.' },
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
    // Only ADMIN and PLATFORM_ADMIN can delete events
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Only ADMIN and PLATFORM_ADMIN can delete events' },
        { status: 403 }
      );
    }

    const { eventId } = await props.params;

    await prisma.event.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EVENTS_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to delete event.' },
      { status: 500 }
    );
  }
}
