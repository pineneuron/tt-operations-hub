'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, Users, MapPin, Video, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { MeetingListItem } from '@/features/meetings/types';
import { MEETING_STATUS_OPTIONS, MEETING_TYPE_OPTIONS } from './options';
import { MeetingCellAction } from './cell-action';

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
    case 'POSTPONED':
      return 'outline';
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
    case 'POSTPONED':
      return 'bg-gray-500 text-white';
    default:
      return '';
  }
};

const getTypeLabel = (type: string) => {
  return MEETING_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
};

export const columns: ColumnDef<MeetingListItem>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Meeting' />
    ),
    cell: ({ row }) => (
      <div className='flex min-w-0 flex-col'>
        <div className='flex items-center gap-2'>
          <Link
            href={`/dashboard/meetings/${row.original.id}`}
            className='text-foreground font-medium hover:underline'
          >
            {row.original.title}
          </Link>
          {row.original.isRecurring && (
            <Repeat className='text-muted-foreground h-3 w-3' />
          )}
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs'>
          <Badge variant='outline'>{getTypeLabel(row.original.type)}</Badge>
        </div>
      </div>
    ),
    enableColumnFilter: true,
    meta: {
      label: 'Meeting title',
      placeholder: 'Filter by meeting title...',
      variant: 'text'
    }
  },
  {
    id: 'time',
    accessorKey: 'startTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Time' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <CalendarDays className='text-muted-foreground h-3.5 w-3.5' />
        <span className='text-sm'>
          {formatDateTime(row.original.startTime)}
        </span>
      </div>
    ),
    meta: {
      label: 'Start time',
      placeholder: 'Filter by start time',
      variant: 'date'
    }
  },
  {
    id: 'location',
    accessorKey: 'location',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Location' />
    ),
    cell: ({ row }) => {
      if (row.original.meetingLink) {
        return (
          <div className='flex items-center gap-1.5'>
            <Video className='text-muted-foreground h-3.5 w-3.5' />
            <a
              href={row.original.meetingLink}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary text-sm hover:underline'
            >
              Join Meeting
            </a>
          </div>
        );
      }
      if (row.original.location) {
        return (
          <div className='flex items-center gap-1.5'>
            <MapPin className='text-muted-foreground h-3.5 w-3.5' />
            <span className='text-sm'>{row.original.location}</span>
          </div>
        );
      }
      return <span className='text-muted-foreground text-sm'>—</span>;
    }
  },
  {
    id: 'participants',
    accessorKey: 'participantCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Participants' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <Users className='text-muted-foreground h-3.5 w-3.5' />
        <span className='text-sm'>{row.original.participantCount}</span>
      </div>
    )
  },
  {
    id: 'organizer',
    accessorKey: 'organizerName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Organizer' />
    ),
    cell: ({ row }) => (
      <span className='text-sm'>
        {row.original.organizerName || row.original.organizerEmail}
      </span>
    ),
    enableColumnFilter: true,
    meta: {
      label: 'Organizer',
      placeholder: 'Search organizers...',
      variant: 'autocomplete',
      searchEndpoint: '/api/users/search'
    }
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
          {(
            MEETING_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ||
            status
          )
            .replace('_', ' ')
            .toUpperCase()}
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
      options: MEETING_STATUS_OPTIONS
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <MeetingCellAction row={row} />
  }
];
