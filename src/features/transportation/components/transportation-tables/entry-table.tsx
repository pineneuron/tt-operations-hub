'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { parseAsInteger } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { entryColumns } from './entry-columns';
import type { TransportationEntryListItem } from '@/features/transportation/types';

interface EntryTableProps {
  data: TransportationEntryListItem[];
  total: number;
}

export function TransportationEntryTable({ data, total }: EntryTableProps) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(20));
  const router = useRouter();

  const pageCount = Math.ceil(total / pageSize);

  const { table } = useDataTable({
    data,
    columns: entryColumns,
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
