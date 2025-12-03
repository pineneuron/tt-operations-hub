'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { parseAsInteger } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { UserRole } from '@/types/user-role';
import { EventDateFilter } from '../event-date-filter';

interface EventTableParams<TData, TValue> {
  data: TData[];
  totalItems: number;
  columns: ColumnDef<TData, TValue>[];
  userRole: UserRole;
}

export function EventTable<TData, TValue>({
  data,
  totalItems,
  columns,
  userRole
}: EventTableParams<TData, TValue>) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(20));
  const router = useRouter();

  const pageCount = Math.ceil(totalItems / pageSize);

  // Only show client search filter for ADMIN and PLATFORM_ADMIN
  const canUseClientSearch =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  // Conditionally modify columns to disable client search filter for non-admin users
  const modifiedColumns = useMemo(() => {
    if (canUseClientSearch) {
      return columns;
    }
    return columns.map((column) => {
      // Check if this is the client column
      if (
        column.id === 'client' ||
        (column as any).accessorKey === 'clientName'
      ) {
        return {
          ...column,
          enableColumnFilter: false
        };
      }
      return column;
    });
  }, [columns, canUseClientSearch]);

  const { table } = useDataTable({
    data,
    columns: modifiedColumns,
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
          <EventDateFilter onDateRangeChange={handleDateRangeChange} />
        )}
      </DataTableToolbar>
    </DataTable>
  );
}
