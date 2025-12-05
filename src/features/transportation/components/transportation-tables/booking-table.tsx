'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { parseAsInteger } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { bookingColumns } from './booking-columns';
import type { TransportationBookingListItem } from '@/features/transportation/types';

interface BookingTableProps {
  data: TransportationBookingListItem[];
  total: number;
}

export function TransportationBookingTable({ data, total }: BookingTableProps) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(20));
  const router = useRouter();

  const pageCount = Math.ceil(total / pageSize);

  const { table } = useDataTable({
    data,
    columns: bookingColumns,
    pageCount,
    shallow: false,
    debounceMs: 500
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
