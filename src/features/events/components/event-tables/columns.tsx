'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, User, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import type { EventListItem } from '@/features/events/types';
import { EVENT_STATUS_OPTIONS } from './options';
import { EventCellAction } from './cell-action';

const formatDate = (value: string) => format(new Date(value), 'MMM dd, yyyy');
const formatDateTime = (value: string) =>
  format(new Date(value), 'MMM dd, yyyy hh:mm a');

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'COMPLETED':
      return 'default';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-500 text-white';
    case 'IN_PROGRESS':
      return 'bg-yellow-500 text-white';
    case 'COMPLETED':
      return 'bg-emerald-500 text-white';
    case 'CANCELLED':
      return 'bg-red-500 text-white';
    default:
      return '';
  }
};

export const columns: ColumnDef<EventListItem>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Event' />
    ),
    cell: ({ row }) => (
      <div className='flex items-start gap-3'>
        {row.original.featuredImageUrl && (
          <Link
            href={`/dashboard/events/${row.original.id}`}
            className='bg-muted relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-80'
          >
            <Image
              src={row.original.featuredImageUrl}
              alt={row.original.title}
              fill
              className='object-cover'
              sizes='48px'
            />
          </Link>
        )}
        <div className='flex min-w-0 flex-col'>
          <Link
            href={`/dashboard/events/${row.original.id}`}
            className='text-foreground font-medium hover:underline'
          >
            {row.original.title}
          </Link>
          {row.original.venue && (
            <div className='mt-0.5 flex items-center gap-1'>
              <MapPin className='text-muted-foreground h-3 w-3' />
              <span className='text-muted-foreground text-xs'>
                {row.original.venue}
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    enableColumnFilter: true,
    meta: {
      label: 'Event title',
      placeholder: 'Filter by event title...',
      variant: 'text'
    }
  },
  {
    id: 'client',
    accessorKey: 'clientName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Client' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <User className='text-muted-foreground h-4 w-4' />
        <div className='flex flex-col'>
          <span className='text-sm'>
            {row.original.clientName || 'Unnamed client'}
          </span>
          <span className='text-muted-foreground text-xs'>
            {row.original.clientEmail}
          </span>
        </div>
      </div>
    ),
    enableColumnFilter: true,
    meta: {
      label: 'Client',
      placeholder: 'Search clients...',
      variant: 'autocomplete',
      searchEndpoint: '/api/users/search'
    }
  },
  {
    id: 'startDate',
    accessorKey: 'startDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Start Date' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <CalendarDays className='text-muted-foreground h-4 w-4' />
        <span className='text-sm'>
          {formatDateTime(row.original.startDate)}
        </span>
      </div>
    ),
    meta: {
      label: 'Start date',
      placeholder: 'Filter by start date',
      variant: 'date'
    }
  },
  {
    id: 'endDate',
    accessorKey: 'endDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='End Date' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <CalendarDays className='text-muted-foreground h-4 w-4' />
        <span className='text-sm'>{formatDateTime(row.original.endDate)}</span>
      </div>
    ),
    meta: {
      label: 'End date',
      placeholder: 'Filter by end date',
      variant: 'date'
    }
  },
  {
    id: 'participants',
    accessorKey: 'participantCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Participants' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Users className='text-muted-foreground h-4 w-4' />
        <span className='text-sm'>{row.original.participantCount}</span>
      </div>
    )
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={getStatusVariant(status) as any}
          className={cn(getStatusColor(status))}
        >
          {status.replace('_', ' ')}
        </Badge>
      );
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    meta: {
      label: 'Status',
      placeholder: 'Select statuses...',
      variant: 'multiSelect',
      options: EVENT_STATUS_OPTIONS
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <EventCellAction data={row.original} />
  }
];
