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
    const currentBookingId = searchParams.get('currentBookingId') || null;

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const userRole = session.user.role as UserRole;

    const where: Prisma.TransportationEntryWhereInput = {
      AND: [
        {
          OR: [
            { vehicleNumber: { contains: query, mode: 'insensitive' } },
            { driverName: { contains: query, mode: 'insensitive' } },
            { actualPickupLocation: { contains: query, mode: 'insensitive' } },
            { actualDropoffLocation: { contains: query, mode: 'insensitive' } }
          ]
        },
        {
          // Show entries without bookings OR entries linked to the current booking (when editing)
          OR: [
            { bookingId: null },
            ...(currentBookingId ? [{ bookingId: currentBookingId }] : [])
          ]
        }
      ]
    };

    // Role-based filtering
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      where.createdById = session.user.id;
    }

    const entries = await prisma.transportationEntry.findMany({
      where,
      select: {
        id: true,
        vehicleNumber: true,
        driverName: true,
        actualPickupLocation: true,
        actualDropoffLocation: true,
        actualPickupDate: true
      },
      take: 10,
      orderBy: {
        actualPickupDate: 'desc'
      }
    });

    // Format entries to be compatible with autocomplete (using user-like structure)
    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      name: `${entry.vehicleNumber} - ${entry.driverName}`,
      email: `${entry.actualPickupLocation} → ${entry.actualDropoffLocation}`,
      username: entry.id
    }));

    // Return in format expected by FormAutocomplete (users array)
    return NextResponse.json({ users: formattedEntries });
  } catch (error) {
    console.error('Entry search error:', error);
    return NextResponse.json(
      { error: 'Failed to search entries' },
      { status: 500 }
    );
  }
}
