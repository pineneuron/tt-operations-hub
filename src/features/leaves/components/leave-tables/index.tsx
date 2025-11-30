'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, useQueryState } from 'nuqs';
import { LeaveDateFilter } from '@/features/leaves/components/leave-date-filter';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/user-role';
import { useMemo } from 'react';

interface LeaveTableParams<TData, TValue> {
  data: TData[];
  totalItems: number;
  columns: ColumnDef<TData, TValue>[];
  userRole?: string;
}

export function LeaveTable<TData, TValue>({
  data,
  totalItems,
  columns,
  userRole
}: LeaveTableParams<TData, TValue>) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(20));
  const router = useRouter();

  const pageCount = Math.ceil(totalItems / pageSize);

  // Only show employee search filter for ADMIN and PLATFORM_ADMIN
  const canUseEmployeeSearch =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  // Conditionally modify columns to disable employee search filter for non-admin users
  const modifiedColumns = useMemo(() => {
    if (canUseEmployeeSearch) {
      return columns;
    }
    return columns.map((column) => {
      // Check if this is the employee/user column (id is 'name' to match server parameter)
      if (column.id === 'name' || (column as any).accessorKey === 'userName') {
        return {
          ...column,
          enableColumnFilter: false
        };
      }
      return column;
    });
  }, [columns, canUseEmployeeSearch]);

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
          <LeaveDateFilter onDateRangeChange={handleDateRangeChange} />
        )}
      </DataTableToolbar>
    </DataTable>
  );
}
