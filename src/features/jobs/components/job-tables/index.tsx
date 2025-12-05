'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { parseAsInteger } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { columns } from './columns';
import type { JobListItem } from '@/features/jobs/types';

interface JobTableProps {
  data: JobListItem[];
  totalItems: number;
}

export function JobTable({ data, totalItems }: JobTableProps) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(20));
  const router = useRouter();

  const pageCount = Math.ceil(totalItems / pageSize);

  const { table } = useDataTable({
    data,
    columns: columns as ColumnDef<JobListItem>[],
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
