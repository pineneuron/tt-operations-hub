import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import {
  TransportationStatus,
  TransportationType,
  type Prisma
} from '@prisma/client';
import { sendPushNotifications } from '@/lib/notifications';

const createBookingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(TransportationType),
  status: z
    .nativeEnum(TransportationStatus)
    .default(TransportationStatus.PENDING),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  pickupDate: z.string().datetime(),
  pickupTime: z.string().datetime().optional().nullable(),
  pickupContactName: z.string().optional().nullable(),
  pickupContactPhone: z.string().optional().nullable(),
  dropoffLocation: z.string().min(1, 'Dropoff location is required'),
  dropoffDate: z.string().datetime().optional().nullable(),
  dropoffTime: z.string().datetime().optional().nullable(),
  dropoffContactName: z.string().optional().nullable(),
  dropoffContactPhone: z.string().optional().nullable(),
  vendorSupplierId: z.string().optional().nullable(),
  entryId: z.string().optional().nullable()
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
    const vendorSupplierId = searchParams.get('vendorSupplierId');

    const userRole = session.user.role as UserRole;
    const skip = (page - 1) * limit;

    const where: Prisma.TransportationBookingWhereInput = {};

    // Role-based filtering
    if (userRole === UserRole.VENDOR_SUPPLIER) {
      // Vendors/Suppliers only see bookings assigned to them
      where.vendorSupplierId = session.user.id;
    } else if (userRole === UserRole.STAFF) {
      // Staff see bookings they created
      where.createdById = session.user.id;
    }
    // ADMIN and PLATFORM_ADMIN see all bookings

    // Apply filters
    if (status) {
      const statusValues = status
        .split(',')
        .filter(Boolean) as TransportationStatus[];
      where.status = { in: statusValues };
    }

    if (type) {
      const typeValues = type
        .split(',')
        .filter(Boolean) as TransportationType[];
      where.type = { in: typeValues };
    }

    if (vendorSupplierId) {
      where.vendorSupplierId = vendorSupplierId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { pickupLocation: { contains: search, mode: 'insensitive' } },
        { dropoffLocation: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.transportationBooking.findMany({
        where,
        include: {
          vendorSupplier: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          entry: {
            select: {
              id: true
            }
          }
        },
        orderBy: [{ pickupDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit
      }),
      prisma.transportationBooking.count({ where })
    ]);

    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      title: booking.title,
      description: booking.description,
      type: booking.type,
      status: booking.status,
      pickupLocation: booking.pickupLocation,
      pickupDate: booking.pickupDate.toISOString(),
      dropoffLocation: booking.dropoffLocation,
      dropoffDate: booking.dropoffDate?.toISOString() || null,
      vendorSupplierId: booking.vendorSupplierId,
      vendorSupplierName: booking.vendorSupplier?.name || null,
      vendorSupplierEmail: booking.vendorSupplier?.email || null,
      createdById: booking.createdById,
      createdByName: booking.createdBy.name || null,
      createdByEmail: booking.createdBy.email,
      hasEntry: !!booking.entry,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString()
    }));

    return NextResponse.json({
      bookings: formattedBookings,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('[TRANSPORTATION_BOOKINGS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch transportation bookings' },
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

    // Only STAFF, ADMIN, and PLATFORM_ADMIN can create bookings
    if (
      userRole !== UserRole.STAFF &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN
    ) {
      return NextResponse.json(
        {
          error: 'You do not have permission to create transportation bookings'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createBookingSchema.parse(body);

    // If entryId is provided, verify it exists and isn't already linked
    if (validatedData.entryId) {
      const existingEntry = await prisma.transportationEntry.findUnique({
        where: { id: validatedData.entryId }
      });

      if (!existingEntry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      }

      if (existingEntry.bookingId) {
        return NextResponse.json(
          { error: 'This entry is already linked to a booking' },
          { status: 400 }
        );
      }
    }

    // Create booking
    const booking = await prisma.transportationBooking.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        type: validatedData.type,
        status: validatedData.status,
        pickupLocation: validatedData.pickupLocation,
        pickupDate: new Date(validatedData.pickupDate),
        pickupTime: validatedData.pickupTime
          ? new Date(validatedData.pickupTime)
          : null,
        pickupContactName: validatedData.pickupContactName || null,
        pickupContactPhone: validatedData.pickupContactPhone || null,
        dropoffLocation: validatedData.dropoffLocation,
        dropoffDate: validatedData.dropoffDate
          ? new Date(validatedData.dropoffDate)
          : null,
        dropoffTime: validatedData.dropoffTime
          ? new Date(validatedData.dropoffTime)
          : null,
        dropoffContactName: validatedData.dropoffContactName || null,
        dropoffContactPhone: validatedData.dropoffContactPhone || null,
        vendorSupplierId: validatedData.vendorSupplierId || null,
        createdById: session.user.id,
        updatedById: session.user.id
      },
      include: {
        vendorSupplier: {
          select: {
            id: true,
            name: true,
            email: true
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

    // Link entry if provided
    if (validatedData.entryId) {
      await prisma.transportationEntry.update({
        where: { id: validatedData.entryId },
        data: { bookingId: booking.id }
      });
    }

    // Send notification to Vendor/Supplier if assigned
    if (booking.vendorSupplierId && booking.vendorSupplier) {
      await sendPushNotifications(
        [booking.vendorSupplierId],
        {
          title: 'New Transportation Booking',
          body: `You have been assigned a new transportation booking: ${booking.title}`
        },
        {
          bookingId: booking.id,
          type: 'BOOKING_CREATED',
          category: 'TRANSPORTATION'
        }
      );
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[TRANSPORTATION_BOOKINGS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create transportation booking' },
      { status: 500 }
    );
  }
}
