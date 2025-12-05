import type {
  TransportationBookingListItem,
  TransportationEntryListItem
} from '@/features/transportation/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { auth } from '@/lib/auth';
import {
  TransportationStatus,
  TransportationType,
  DeliveryStatus,
  type Prisma
} from '@prisma/client';
import { UserRole } from '@/types/user-role';
import { TransportationListingWrapper } from './transportation-listing-wrapper';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export default async function TransportationListingPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;

  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const search = searchParamsCache.get('search');
  const statusFilter = searchParamsCache.get('status');
  const typeFilter = searchParamsCache.get('type');
  const tab = searchParamsCache.get('tab') || 'bookings'; // bookings | entries

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const statusValues =
    statusFilter?.split(',').filter(Boolean) ?? ([] as string[]);
  const typeValues = typeFilter?.split(',').filter(Boolean) ?? ([] as string[]);

  // Fetch bookings
  const bookingWhere: Prisma.TransportationBookingWhereInput = {};

  // Role-based filtering for bookings
  if (userRole === UserRole.VENDOR_SUPPLIER) {
    bookingWhere.vendorSupplierId = session?.user?.id;
  } else if (userRole === UserRole.STAFF) {
    bookingWhere.createdById = session?.user?.id;
  }
  // ADMIN and PLATFORM_ADMIN see all

  if (statusValues.length) {
    bookingWhere.status = {
      in: statusValues as TransportationStatus[]
    };
  }

  if (typeValues.length) {
    bookingWhere.type = {
      in: typeValues as TransportationType[]
    };
  }

  if (search) {
    bookingWhere.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { pickupLocation: { contains: search, mode: 'insensitive' } },
      { dropoffLocation: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Fetch entries
  const entryWhere: Prisma.TransportationEntryWhereInput = {};

  // Role-based filtering for entries
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
    entryWhere.createdById = session?.user?.id;
  }

  if (typeValues.length) {
    entryWhere.type = {
      in: typeValues as TransportationType[]
    };
  }

  if (search) {
    entryWhere.OR = [
      { vehicleNumber: { contains: search, mode: 'insensitive' } },
      { driverName: { contains: search, mode: 'insensitive' } },
      { actualPickupLocation: { contains: search, mode: 'insensitive' } },
      { actualDropoffLocation: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [bookings, bookingsTotal, entries, entriesTotal] = await Promise.all([
    prisma.transportationBooking.findMany({
      where: bookingWhere,
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
    prisma.transportationBooking.count({ where: bookingWhere }),
    prisma.transportationEntry.findMany({
      where: entryWhere,
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
    prisma.transportationEntry.count({ where: entryWhere })
  ]);

  const bookingData: TransportationBookingListItem[] = bookings.map(
    (booking) => ({
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
    })
  );

  const entryData: TransportationEntryListItem[] = entries.map((entry) => ({
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

  return (
    <TransportationListingWrapper
      bookingData={bookingData}
      bookingsTotal={bookingsTotal}
      entryData={entryData}
      entriesTotal={entriesTotal}
      userRole={userRole}
    />
  );
}
