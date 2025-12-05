'use client';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useTransportationBookingModal } from '@/features/transportation/hooks/use-transportation-booking-modal';
import { useTransportationEntryModal } from '@/features/transportation/hooks/use-transportation-entry-modal';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';
import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';

export function TransportationPageActions() {
  const { openModal: openBookingModal } = useTransportationBookingModal();
  const { openModal: openEntryModal } = useTransportationEntryModal();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;
  const [tab] = useQueryState('tab', parseAsString.withDefault('bookings'));

  const currentTab = tab || 'bookings';

  // STAFF, ADMIN, and PLATFORM_ADMIN can create bookings
  const canCreateBooking =
    userRole === UserRole.STAFF ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN;

  // Vendor/Supplier, Staff, Admin, and Platform Admin can create entries
  const canCreateEntry =
    userRole === UserRole.VENDOR_SUPPLIER ||
    userRole === UserRole.STAFF ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN;

  if (currentTab === 'bookings' && canCreateBooking) {
    return (
      <Button onClick={() => openBookingModal()}>
        <IconPlus className='h-4 w-4' />
        Create Booking
      </Button>
    );
  }

  if (currentTab === 'entries' && canCreateEntry) {
    return (
      <Button onClick={() => openEntryModal()}>
        <IconPlus className='h-4 w-4' />
        Create Entry
      </Button>
    );
  }

  return null;
}
