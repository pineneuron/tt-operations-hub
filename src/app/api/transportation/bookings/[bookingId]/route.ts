import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { TransportationStatus, TransportationType } from '@prisma/client';

type RouteParams = {
  params: Promise<{
    bookingId: string;
  }>;
};

const updateBookingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(TransportationType).optional(),
  status: z.nativeEnum(TransportationStatus).optional(),
  pickupLocation: z.string().min(1).optional(),
  pickupDate: z.string().datetime().optional(),
  pickupTime: z.string().datetime().optional().nullable(),
  pickupContactName: z.string().optional().nullable(),
  pickupContactPhone: z.string().optional().nullable(),
  dropoffLocation: z.string().min(1).optional(),
  dropoffDate: z.string().datetime().optional().nullable(),
  dropoffTime: z.string().datetime().optional().nullable(),
  dropoffContactName: z.string().optional().nullable(),
  dropoffContactPhone: z.string().optional().nullable(),
  vendorSupplierId: z.string().optional().nullable(),
  entryId: z.string().optional().nullable()
});

export async function GET(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await props.params;

    const booking = await prisma.transportationBooking.findUnique({
      where: { id: bookingId },
      include: {
        vendorSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entry: {
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
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;

    // Check permissions
    if (userRole === UserRole.VENDOR_SUPPLIER) {
      if (booking.vendorSupplierId !== session.user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this booking' },
          { status: 403 }
        );
      }
    } else if (userRole === UserRole.STAFF) {
      if (booking.createdById !== session.user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this booking' },
          { status: 403 }
        );
      }
    }
    // ADMIN and PLATFORM_ADMIN can view all

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('[TRANSPORTATION_BOOKING_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch transportation booking' },
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

    const { bookingId } = await props.params;
    const body = await request.json();
    const validatedData = updateBookingSchema.parse(body);

    // Check if booking exists
    const existingBooking = await prisma.transportationBooking.findUnique({
      where: { id: bookingId }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;

    // Check permissions - only creator, ADMIN, or PLATFORM_ADMIN can update
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      existingBooking.createdById !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to update this booking' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (validatedData.title !== undefined)
      updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;
    if (validatedData.pickupLocation !== undefined)
      updateData.pickupLocation = validatedData.pickupLocation;
    if (validatedData.pickupDate !== undefined)
      updateData.pickupDate = new Date(validatedData.pickupDate);
    if (validatedData.pickupTime !== undefined)
      updateData.pickupTime = validatedData.pickupTime
        ? new Date(validatedData.pickupTime)
        : null;
    if (validatedData.pickupContactName !== undefined)
      updateData.pickupContactName = validatedData.pickupContactName;
    if (validatedData.pickupContactPhone !== undefined)
      updateData.pickupContactPhone = validatedData.pickupContactPhone;
    if (validatedData.dropoffLocation !== undefined)
      updateData.dropoffLocation = validatedData.dropoffLocation;
    if (validatedData.dropoffDate !== undefined)
      updateData.dropoffDate = validatedData.dropoffDate
        ? new Date(validatedData.dropoffDate)
        : null;
    if (validatedData.dropoffTime !== undefined)
      updateData.dropoffTime = validatedData.dropoffTime
        ? new Date(validatedData.dropoffTime)
        : null;
    if (validatedData.dropoffContactName !== undefined)
      updateData.dropoffContactName = validatedData.dropoffContactName;
    if (validatedData.dropoffContactPhone !== undefined)
      updateData.dropoffContactPhone = validatedData.dropoffContactPhone;
    if (validatedData.vendorSupplierId !== undefined)
      updateData.vendorSupplierId = validatedData.vendorSupplierId || null;

    updateData.updatedById = session.user.id;

    // Handle entry linking/unlinking
    if (validatedData.entryId !== undefined) {
      // Get current entry linked to this booking
      const currentEntry = await prisma.transportationEntry.findFirst({
        where: { bookingId: bookingId }
      });

      // If there's a current entry and it's different from the new one, unlink it
      if (currentEntry && currentEntry.id !== validatedData.entryId) {
        await prisma.transportationEntry.update({
          where: { id: currentEntry.id },
          data: { bookingId: null }
        });
      }

      // If a new entry is provided, link it
      if (validatedData.entryId) {
        const newEntry = await prisma.transportationEntry.findUnique({
          where: { id: validatedData.entryId }
        });

        if (!newEntry) {
          return NextResponse.json(
            { error: 'Entry not found' },
            { status: 404 }
          );
        }

        if (newEntry.bookingId && newEntry.bookingId !== bookingId) {
          return NextResponse.json(
            { error: 'This entry is already linked to another booking' },
            { status: 400 }
          );
        }

        await prisma.transportationEntry.update({
          where: { id: validatedData.entryId },
          data: { bookingId: bookingId }
        });
      } else if (currentEntry) {
        // If entryId is null, unlink the current entry
        await prisma.transportationEntry.update({
          where: { id: currentEntry.id },
          data: { bookingId: null }
        });
      }
    }

    const updatedBooking = await prisma.transportationBooking.update({
      where: { id: bookingId },
      data: updateData,
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
      }
    });

    return NextResponse.json({ booking: updatedBooking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[TRANSPORTATION_BOOKING_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to update transportation booking' },
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

    const { bookingId } = await props.params;

    const booking = await prisma.transportationBooking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;

    // Only creator, ADMIN, or PLATFORM_ADMIN can delete
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      booking.createdById !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this booking' },
        { status: 403 }
      );
    }

    // Check if entry exists - if so, we need to handle it
    const entry = await prisma.transportationEntry.findUnique({
      where: { bookingId }
    });

    if (entry) {
      // Unlink entry from booking (set bookingId to null)
      await prisma.transportationEntry.update({
        where: { id: entry.id },
        data: { bookingId: null }
      });
    }

    await prisma.transportationBooking.delete({
      where: { id: bookingId }
    });

    return NextResponse.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('[TRANSPORTATION_BOOKING_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete transportation booking' },
      { status: 500 }
    );
  }
}
