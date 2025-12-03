import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { EventStatus, EventUpdateType, type Prisma } from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  clientId: z.string().min(1, 'Client is required'),
  venue: z.string().optional().nullable(),
  featuredImageUrl: z.string().url().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.nativeEnum(EventStatus).default(EventStatus.SCHEDULED),
  staffIds: z.array(z.string()).optional().default([])
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
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const type = searchParams.get('type'); // upcoming | past

    const userRole = session.user.role as UserRole;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    // Role-based filtering
    if (userRole === UserRole.CLIENT) {
      // Clients only see their own events
      where.clientId = session.user.id;
    } else if (userRole === UserRole.STAFF) {
      // Staff only see events they're assigned to as STAFF
      where.participants = {
        some: {
          userId: session.user.id,
          role: 'STAFF'
        }
      };
    } else if (userRole === UserRole.VENDOR_SUPPLIER) {
      // Vendors/Suppliers see events they're assigned to
      where.participants = {
        some: {
          userId: session.user.id,
          role: { in: ['VENDOR', 'SUPPLIER'] }
        }
      };
    }
    // ADMIN and PLATFORM_ADMIN see all events

    // Apply filters
    if (status) {
      const statusValues = status.split(',').filter(Boolean) as EventStatus[];
      where.status = { in: statusValues };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (dateFrom || dateTo) {
      where.OR = [
        {
          startDate: {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined
          }
        },
        {
          endDate: {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined
          }
        }
      ];
    }

    // Upcoming / Past filter (based on endDate)
    if (type === 'upcoming') {
      const now = new Date();
      where.endDate = {
        gte: now
      };
    } else if (type === 'past') {
      const now = new Date();
      where.endDate = {
        lt: now
      };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          client: {
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
          startDate: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.event.count({ where })
    ]);

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      clientId: event.clientId,
      clientName: event.client.name,
      clientEmail: event.client.email,
      venue: event.venue,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      status: event.status,
      participantCount: event._count.participants,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString()
    }));

    return NextResponse.json({
      events: formattedEvents,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
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
    // Only ADMIN and PLATFORM_ADMIN can create events
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Only ADMIN and PLATFORM_ADMIN can create events' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    // Validate dates
    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after or equal to start date' },
        { status: 400 }
      );
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        clientId: validatedData.clientId,
        venue: validatedData.venue || null,
        featuredImageUrl: validatedData.featuredImageUrl || null,
        startDate,
        endDate,
        status: validatedData.status
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Add creator as coordinator participant
    await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: session.user.id,
        role: 'COORDINATOR'
      }
    });

    // Add selected staff as participants
    if (validatedData.staffIds && validatedData.staffIds.length > 0) {
      // Verify all staffIds are valid users with STAFF role
      const staffUsers = await prisma.user.findMany({
        where: {
          id: { in: validatedData.staffIds },
          role: 'STAFF',
          isActive: true
        },
        select: { id: true }
      });

      const validStaffIds = staffUsers.map((u) => u.id);

      if (validStaffIds.length > 0) {
        await prisma.eventParticipant.createMany({
          data: validStaffIds.map((staffId) => ({
            eventId: event.id,
            userId: staffId,
            role: 'STAFF',
            invitedBy: session.user.id
          })),
          skipDuplicates: true
        });
      }
    }

    // Create initial event update for event creation
    const statusLabelMap: Record<EventStatus, string> = {
      SCHEDULED: 'Scheduled',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled'
    };
    const statusLabel = statusLabelMap[event.status] || event.status;

    await prisma.eventUpdate.create({
      data: {
        eventId: event.id,
        createdById: session.user.id,
        type: EventUpdateType.STATUS,
        status: event.status,
        message: `Event created with status: ${statusLabel}`
      }
    });

    // Send notification to client
    const notification = await prisma.notification.create({
      data: {
        category: 'EVENT',
        title: `New event: ${event.title}`,
        body: `Event scheduled from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        entityType: 'EVENT',
        entityId: event.id,
        data: {
          type: 'EVENT_CREATED',
          eventId: event.id,
          eventTitle: event.title,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    });

    await prisma.notificationReceipt.create({
      data: {
        notificationId: notification.id,
        userId: event.clientId,
        channel: 'IN_APP'
      }
    });

    // Send FCM push notification to client
    await sendPushNotifications(
      [event.clientId],
      {
        title: notification.title,
        body: notification.body || ''
      },
      {
        notificationId: notification.id,
        entityType: 'EVENT',
        entityId: event.id,
        url: `/dashboard/events`
      }
    );

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[EVENTS_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create event.' },
      { status: 500 }
    );
  }
}
