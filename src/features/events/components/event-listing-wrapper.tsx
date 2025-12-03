'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { EventTable } from './event-tables';
import { EventCalendarView } from './event-calendar-view';
import { EventViewToggle } from './event-view-toggle';
import { columns } from './event-tables/columns';
import type { EventListItem } from '@/features/events/types';
import { UserRole } from '@/types/user-role';
import { EventStatus } from '@prisma/client';

interface EventListingWrapperProps {
  tableData: EventListItem[];
  totalItems: number;
  userRole: UserRole;
  calendarEvents: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    status: EventStatus;
    featuredImageUrl?: string | null;
  }>;
}

export function EventListingWrapper({
  tableData,
  totalItems,
  userRole,
  calendarEvents
}: EventListingWrapperProps) {
  const [view] = useQueryState(
    'view',
    parseAsString.withDefault('table').withOptions({
      clearOnDefault: true
    })
  ) as [string | null, (value: string | null) => void];

  const currentView = view || 'table';

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-4'>
      <div className='flex flex-shrink-0 items-center justify-end'>
        <EventViewToggle />
      </div>
      {currentView === 'calendar' ? (
        <div className='mb-10 min-h-0 flex-1'>
          <EventCalendarView events={calendarEvents} />
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col'>
          <EventTable
            data={tableData}
            totalItems={totalItems}
            columns={columns}
            userRole={userRole}
          />
        </div>
      )}
    </div>
  );
}
