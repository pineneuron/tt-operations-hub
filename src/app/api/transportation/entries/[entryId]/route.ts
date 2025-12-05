import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { TransportationType, DeliveryStatus } from '@prisma/client';

type RouteParams = {
  params: Promise<{
    entryId: string;
  }>;
};

const updateEntrySchema = z
  .object({
    bookingId: z.string().optional().nullable(),
    type: z.nativeEnum(TransportationType).optional(),
    deliveryStatus: z.nativeEnum(DeliveryStatus).optional().nullable(),
    vehicleNumber: z.string().min(1).optional(),
    driverName: z.string().min(1).optional(),
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
      // Only validate if type is provided
      if (!data.type) return true;
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
      // Only validate if type is provided
      if (!data.type) return true;
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

export async function GET(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = await props.params;

    const entry = await prisma.transportationEntry.findUnique({
      where: { id: entryId },
      include: {
        booking: {
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
            }
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
        }
      }
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;

    // Check permissions - ADMIN and PLATFORM_ADMIN can view all, others only their own
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      entry.createdById !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view this entry' },
        { status: 403 }
      );
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('[TRANSPORTATION_ENTRY_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch transportation entry' },
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

    const { entryId } = await props.params;
    const body = await request.json();
    const validatedData = updateEntrySchema.parse(body);

    // Check if entry exists
    const existingEntry = await prisma.transportationEntry.findUnique({
      where: { id: entryId }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;

    // Check permissions - only creator, ADMIN, or PLATFORM_ADMIN can update
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      existingEntry.createdById !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to update this entry' },
        { status: 403 }
      );
    }

    // If bookingId is being updated, verify it exists and isn't already linked
    if (validatedData.bookingId !== undefined && validatedData.bookingId) {
      const existingBooking = await prisma.transportationBooking.findUnique({
        where: { id: validatedData.bookingId }
      });

      if (!existingBooking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      // Check if booking already has an entry (and it's not this one)
      const existingLinkedEntry = await prisma.transportationEntry.findUnique({
        where: { bookingId: validatedData.bookingId }
      });

      if (existingLinkedEntry && existingLinkedEntry.id !== entryId) {
        return NextResponse.json(
          { error: 'This booking already has an entry linked to it' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (validatedData.bookingId !== undefined)
      updateData.bookingId = validatedData.bookingId || null;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.deliveryStatus !== undefined)
      updateData.deliveryStatus = validatedData.deliveryStatus || null;
    if (validatedData.vehicleNumber !== undefined)
      updateData.vehicleNumber = validatedData.vehicleNumber;
    if (validatedData.driverName !== undefined)
      updateData.driverName = validatedData.driverName;
    if (validatedData.driverPhone !== undefined)
      updateData.driverPhone = validatedData.driverPhone || null;
    if (validatedData.actualPickupLocation !== undefined)
      updateData.actualPickupLocation =
        validatedData.actualPickupLocation || '';
    if (
      validatedData.actualPickupDate !== undefined &&
      validatedData.actualPickupDate
    )
      updateData.actualPickupDate = new Date(validatedData.actualPickupDate);
    if (validatedData.actualPickupTime !== undefined)
      updateData.actualPickupTime = validatedData.actualPickupTime
        ? new Date(validatedData.actualPickupTime)
        : null;
    if (validatedData.actualDropoffLocation !== undefined)
      updateData.actualDropoffLocation =
        validatedData.actualDropoffLocation || '';
    if (
      validatedData.actualDropoffDate !== undefined &&
      validatedData.actualDropoffDate
    )
      updateData.actualDropoffDate = validatedData.actualDropoffDate
        ? new Date(validatedData.actualDropoffDate)
        : null;
    if (validatedData.actualDropoffTime !== undefined)
      updateData.actualDropoffTime = validatedData.actualDropoffTime
        ? new Date(validatedData.actualDropoffTime)
        : null;
    if (validatedData.notes !== undefined)
      updateData.notes = validatedData.notes || null;

    updateData.updatedById = session.user.id;

    const updatedEntry = await prisma.transportationEntry.update({
      where: { id: entryId },
      data: updateData,
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

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[TRANSPORTATION_ENTRY_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to update transportation entry' },
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

    const { entryId } = await props.params;

    const entry = await prisma.transportationEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;

    // Only creator, ADMIN, or PLATFORM_ADMIN can delete
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      entry.createdById !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this entry' },
        { status: 403 }
      );
    }

    await prisma.transportationEntry.delete({
      where: { id: entryId }
    });

    return NextResponse.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('[TRANSPORTATION_ENTRY_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete transportation entry' },
      { status: 500 }
    );
  }
}
