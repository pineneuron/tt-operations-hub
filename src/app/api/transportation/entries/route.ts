import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import {
  TransportationType,
  DeliveryStatus,
  type Prisma
} from '@prisma/client';

const createEntrySchema = z
  .object({
    bookingId: z.string().optional().nullable(),
    type: z.nativeEnum(TransportationType),
    deliveryStatus: z.nativeEnum(DeliveryStatus).optional().nullable(),
    vehicleNumber: z.string().min(1, 'Vehicle number is required'),
    driverName: z.string().min(1, 'Driver name is required'),
    driverPhone: z.string().optional().nullable(),
    actualPickupLocation: z.string().optional().nullable(),
    actualPickupDate: z.string().datetime().optional().nullable(),
    actualPickupTime: z.string().datetime().optional().nullable(),
    actualDropoffLocation: z.string().optional().nullable(),
    actualDropoffDate: z.string().datetime().optional().nullable(),
    actualDropoffTime: z.string().datetime().optional().nullable(),
    notes: z.string().optional().nullable()
  })
  .refine(
    (data) => {
      // PICKUP and ROUND_TRIP require pickup location and date
      if (
        data.type === TransportationType.PICKUP ||
        data.type === TransportationType.ROUND_TRIP
      ) {
        if (
          !data.actualPickupLocation ||
          data.actualPickupLocation.trim() === ''
        ) {
          return false;
        }
        if (!data.actualPickupDate) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Pickup location and date are required for this type.',
      path: ['actualPickupLocation']
    }
  )
  .refine(
    (data) => {
      // DROPOFF, ROUND_TRIP, and DELIVERY require dropoff location
      if (
        data.type === TransportationType.DROPOFF ||
        data.type === TransportationType.ROUND_TRIP ||
        data.type === TransportationType.DELIVERY
      ) {
        if (
          !data.actualDropoffLocation ||
          data.actualDropoffLocation.trim() === ''
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Dropoff location is required for this type.',
      path: ['actualDropoffLocation']
    }
  );

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const deliveryStatus = searchParams.get('deliveryStatus');
    const bookingId = searchParams.get('bookingId');
    const search = searchParams.get('search');

    const userRole = session.user.role as UserRole;
    const skip = (page - 1) * limit;

    const where: Prisma.TransportationEntryWhereInput = {};

    // Role-based filtering
    // ADMIN and PLATFORM_ADMIN see all entries
    // Others see entries they created
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      where.createdById = session.user.id;
    }

    // Apply filters
    if (type) {
      const typeValues = type
        .split(',')
        .filter(Boolean) as TransportationType[];
      where.type = { in: typeValues };
    }

    if (deliveryStatus) {
      const statusValues = deliveryStatus
        .split(',')
        .filter(Boolean) as DeliveryStatus[];
      where.deliveryStatus = { in: statusValues };
    }

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (search) {
      where.OR = [
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
        { driverName: { contains: search, mode: 'insensitive' } },
        { actualPickupLocation: { contains: search, mode: 'insensitive' } },
        { actualDropoffLocation: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.transportationEntry.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              title: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [{ actualPickupDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit
      }),
      prisma.transportationEntry.count({ where })
    ]);

    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      bookingId: entry.bookingId,
      bookingTitle: entry.booking?.title || null,
      type: entry.type,
      deliveryStatus: entry.deliveryStatus,
      vehicleNumber: entry.vehicleNumber,
      driverName: entry.driverName,
      driverPhone: entry.driverPhone,
      actualPickupLocation: entry.actualPickupLocation,
      actualPickupDate: entry.actualPickupDate.toISOString(),
      actualDropoffLocation: entry.actualDropoffLocation,
      actualDropoffDate: entry.actualDropoffDate?.toISOString() || null,
      createdById: entry.createdById,
      createdByName: entry.createdBy.name || null,
      createdByEmail: entry.createdBy.email,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    }));

    return NextResponse.json({
      entries: formattedEntries,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('[TRANSPORTATION_ENTRIES_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch transportation entries' },
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

    // Vendor/Supplier, Staff, Admin, and Platform Admin can create entries
    if (
      userRole !== UserRole.VENDOR_SUPPLIER &&
      userRole !== UserRole.STAFF &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN
    ) {
      return NextResponse.json(
        {
          error: 'You do not have permission to create transportation entries'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createEntrySchema.parse(body);

    // If bookingId is provided, verify it exists and isn't already linked
    if (validatedData.bookingId) {
      const existingBooking = await prisma.transportationBooking.findUnique({
        where: { id: validatedData.bookingId }
      });

      if (!existingBooking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      // Check if booking already has an entry
      const existingEntry = await prisma.transportationEntry.findUnique({
        where: { bookingId: validatedData.bookingId }
      });

      if (existingEntry) {
        return NextResponse.json(
          { error: 'This booking already has an entry linked to it' },
          { status: 400 }
        );
      }
    }

    // Create entry
    const entry = await prisma.transportationEntry.create({
      data: {
        bookingId: validatedData.bookingId || null,
        type: validatedData.type,
        deliveryStatus: validatedData.deliveryStatus || null,
        vehicleNumber: validatedData.vehicleNumber,
        driverName: validatedData.driverName,
        driverPhone: validatedData.driverPhone || null,
        actualPickupLocation: validatedData.actualPickupLocation || '',
        actualPickupDate: validatedData.actualPickupDate
          ? new Date(validatedData.actualPickupDate)
          : new Date(),
        actualPickupTime: validatedData.actualPickupTime
          ? new Date(validatedData.actualPickupTime)
          : null,
        actualDropoffLocation: validatedData.actualDropoffLocation || '',
        actualDropoffDate: validatedData.actualDropoffDate
          ? new Date(validatedData.actualDropoffDate)
          : null,
        actualDropoffTime: validatedData.actualDropoffTime
          ? new Date(validatedData.actualDropoffTime)
          : null,
        notes: validatedData.notes || null,
        createdById: session.user.id,
        updatedById: session.user.id
      },
      include: {
        booking: {
          select: {
            id: true,
            title: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[TRANSPORTATION_ENTRIES_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create transportation entry' },
      { status: 500 }
    );
  }
}
