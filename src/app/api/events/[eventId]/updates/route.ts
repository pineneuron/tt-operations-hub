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

const createUpdateSchema = z.object({
  type: z.nativeEnum(EventUpdateType),
  status: z.nativeEnum(EventStatus).optional().nullable(),
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

    const { eventId } = await props.params;

    const updates = await prisma.eventUpdate.findMany({
      where: { eventId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
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
    console.error('[EVENT_UPDATES_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch event updates' },
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

    const { eventId } = await props.params;
    const body = await request.json();
    const validatedData = createUpdateSchema.parse(body);

    // Check if user is assigned to this event (staff/vendor) or is admin
    const userRole = session.user.role as UserRole;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

    if (!isAdmin) {
      // Check if user is a participant
      const participant = await prisma.eventParticipant.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: session.user.id
          }
        }
      });

      if (!participant) {
        return NextResponse.json(
          { error: 'You are not assigned to this event' },
          { status: 403 }
        );
      }
    }

    // Get event details
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
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Create update
    const update = await prisma.eventUpdate.create({
      data: {
        eventId,
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
            email: true
          }
        }
      }
    });

    // Link media to update if provided
    if (validatedData.mediaIds && validatedData.mediaIds.length > 0) {
      await prisma.eventMedia.updateMany({
        where: {
          id: { in: validatedData.mediaIds },
          eventId,
          updateId: null // Only link media that isn't already linked
        },
        data: {
          updateId: update.id
        }
      });
    }

    // Update event status if provided
    if (validatedData.status) {
      await prisma.event.update({
        where: { id: eventId },
        data: { status: validatedData.status }
      });
    }

    // Get updated update with media
    const updateWithMedia = await prisma.eventUpdate.findUnique({
      where: { id: update.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        media: true
      }
    });

    // Send notifications to:
    // 1. Client (event owner)
    // 2. Admins/Coordinators
    // 3. Other assigned staff (optional - can be configured)

    const notificationTargets = [
      event.clientId, // Client always gets notified
      ...event.participants
        .filter((p) => p.role === 'COORDINATOR' || p.role === 'CLIENT')
        .map((p) => p.userId)
    ];

    // Remove duplicates and current user
    const uniqueTargets = Array.from(
      new Set(notificationTargets.filter((id) => id !== session.user.id))
    );

    if (uniqueTargets.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          category: 'EVENT',
          title: `Update on ${event.title}`,
          body: `${session.user.name || session.user.email}: ${validatedData.message}`,
          entityType: 'EVENT',
          entityId: eventId,
          data: {
            type: 'EVENT_UPDATE',
            eventId,
            eventTitle: event.title,
            updateId: update.id,
            updateType: validatedData.type
          }
        }
      });

      // Create notification receipts
      await prisma.notificationReceipt.createMany({
        data: uniqueTargets.map((userId) => ({
          notificationId: notification.id,
          userId,
          channel: 'IN_APP'
        }))
      });

      // Send FCM push notifications
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

    return NextResponse.json({ update: updateWithMedia }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[EVENT_UPDATES_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create event update.' },
      { status: 500 }
    );
  }
}
