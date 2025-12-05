'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransportationBookingTable } from './transportation-tables/booking-table';
import { TransportationEntryTable } from './transportation-tables/entry-table';
import type {
  TransportationBookingListItem,
  TransportationEntryListItem
} from '@/features/transportation/types';
import { UserRole } from '@/types/user-role';
import { IconTruck, IconClipboardList } from '@tabler/icons-react';

interface TransportationListingWrapperProps {
  bookingData: TransportationBookingListItem[];
  bookingsTotal: number;
  entryData: TransportationEntryListItem[];
  entriesTotal: number;
  userRole: UserRole;
}

export function TransportationListingWrapper({
  bookingData,
  bookingsTotal,
  entryData,
  entriesTotal,
  userRole
}: TransportationListingWrapperProps) {
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsString.withDefault('bookings')
  );

  const currentTab = tab || 'bookings';

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-4'>
      <Tabs
        value={currentTab}
        onValueChange={setTab}
        className='flex min-h-0 flex-1 flex-col'
      >
        <TabsList>
          <TabsTrigger value='bookings' className='gap-2'>
            <IconClipboardList className='h-4 w-4' />
            Bookings
          </TabsTrigger>
          <TabsTrigger value='entries' className='gap-2'>
            <IconTruck className='h-4 w-4' />
            Vehicle Entries
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='bookings'
          className='mt-4 flex min-h-0 flex-1 flex-col'
        >
          <TransportationBookingTable
            data={bookingData}
            total={bookingsTotal}
          />
        </TabsContent>

        <TabsContent
          value='entries'
          className='mt-4 flex min-h-0 flex-1 flex-col'
        >
          <TransportationEntryTable data={entryData} total={entriesTotal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
