'use client';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import type { HolidayListItem } from '@/features/holidays/types';
import { YEAR_OPTIONS, RECURRING_OPTIONS } from './options';
import { HolidayCellAction } from './cell-action';
import { Badge } from '@/components/ui/badge';

const formatDate = (value: string) => format(new Date(value), 'MMM dd, yyyy');

export const columns: ColumnDef<HolidayListItem>[] = [
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ row }) => {
      const category = row.original.category;
      return <span className='text-sm font-medium'>{category}</span>;
    },
    meta: {
      label: 'Category',
      placeholder: 'Search categories...',
      variant: 'text',
      icon: CalendarDays
    },
    enableColumnFilter: true
  },
  {
    id: 'date',
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Date' />
    ),
    cell: ({ row }) => {
      return <span className='text-sm'>{formatDate(row.original.date)}</span>;
    },
    meta: {
      label: 'Date',
      variant: 'date'
    }
  },
  {
    id: 'year',
    accessorKey: 'year',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Year' />
    ),
    cell: ({ row }) => {
      return <span className='text-sm'>{row.original.year}</span>;
    },
    meta: {
      label: 'Year',
      variant: 'multiSelect',
      options: YEAR_OPTIONS,
      icon: CalendarDays
    },
    enableColumnFilter: true
  },
  {
    id: 'isRecurring',
    accessorKey: 'isRecurring',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => {
      const isRecurring = row.original.isRecurring;
      return (
        <Badge variant={isRecurring ? 'default' : 'outline'}>
          {isRecurring ? 'Recurring' : 'One-time'}
        </Badge>
      );
    },
    meta: {
      label: 'Type',
      variant: 'multiSelect',
      options: RECURRING_OPTIONS,
      icon: CalendarDays
    },
    enableColumnFilter: true
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const description = row.original.description;
      return (
        <span className='text-muted-foreground text-sm'>
          {description || '—'}
        </span>
      );
    }
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <CalendarDays className='text-muted-foreground/70 h-4 w-4' />
        <span>{formatDate(row.original.createdAt)}</span>
      </div>
    )
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <HolidayCellAction data={row.original} />
  }
];
