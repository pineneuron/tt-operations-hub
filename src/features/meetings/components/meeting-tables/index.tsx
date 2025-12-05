'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { parseAsInteger } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { columns } from './columns';
import type { MeetingListItem } from '@/features/meetings/types';
import { UserRole } from '@/types/user-role';
import { MeetingDateFilter } from '../meeting-date-filter';

interface MeetingTableProps {
  data: MeetingListItem[];
  total: number;
  userRole: UserRole;
}

export function MeetingTable({ data, total, userRole }: MeetingTableProps) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(20));
  const router = useRouter();

  const pageCount = Math.ceil(total / pageSize);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500
  });

  const handleDateRangeChange = () => {
    // Trigger a refresh when date range changes
    router.refresh();
  };

  // Only show date filter for ADMIN and PLATFORM_ADMIN
  const canUseDateFilter =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table}>
        {canUseDateFilter && (
          <MeetingDateFilter onDateRangeChange={handleDateRangeChange} />
        )}
      </DataTableToolbar>
    </DataTable>
  );
}
