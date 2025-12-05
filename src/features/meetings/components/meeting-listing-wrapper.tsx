'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { MeetingTable } from './meeting-tables';
import { MeetingCalendarView } from './meeting-calendar-view';
import type { MeetingListItem } from '@/features/meetings/types';
import { UserRole } from '@/types/user-role';
import { MeetingStatus } from '@prisma/client';

interface MeetingListingWrapperProps {
  tableData: MeetingListItem[];
  totalItems: number;
  userRole: UserRole;
  calendarMeetings: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: MeetingStatus;
    type: string;
  }>;
}

export function MeetingListingWrapper({
  tableData,
  totalItems,
  userRole,
  calendarMeetings
}: MeetingListingWrapperProps) {
  const [view] = useQueryState(
    'view',
    parseAsString.withDefault('table').withOptions({
      clearOnDefault: true
    })
  ) as [string | null, (value: string | null) => void];

  const currentView = view || 'table';

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-4'>
      {currentView === 'calendar' ? (
        <div className='mb-10 min-h-0 flex-1'>
          <MeetingCalendarView meetings={calendarMeetings} />
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col'>
          <MeetingTable
            data={tableData}
            total={totalItems}
            userRole={userRole}
          />
        </div>
      )}
    </div>
  );
}
