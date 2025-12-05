import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { type Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ bookings: [] });
    }

    const userRole = session.user.role as UserRole;

    const where: Prisma.TransportationBookingWhereInput = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { pickupLocation: { contains: query, mode: 'insensitive' } },
        { dropoffLocation: { contains: query, mode: 'insensitive' } }
      ],
      // Only show bookings without entries (can be linked)
      entry: null
    };

    // Role-based filtering
    if (userRole === UserRole.VENDOR_SUPPLIER) {
      where.vendorSupplierId = session.user.id;
    } else if (userRole === UserRole.STAFF) {
      where.createdById = session.user.id;
    }
    // ADMIN and PLATFORM_ADMIN see all

    const bookings = await prisma.transportationBooking.findMany({
      where,
      select: {
        id: true,
        title: true,
        pickupLocation: true,
        dropoffLocation: true,
        pickupDate: true
      },
      take: 10,
      orderBy: {
        pickupDate: 'desc'
      }
    });

    // Format bookings to be compatible with autocomplete (using user-like structure)
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      name: booking.title,
      email: `${booking.pickupLocation} → ${booking.dropoffLocation}`,
      username: booking.id
    }));

    return NextResponse.json({ users: formattedBookings });
  } catch (error) {
    console.error('Booking search error:', error);
    return NextResponse.json(
      { error: 'Failed to search bookings' },
      { status: 500 }
    );
  }
}
