'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, User } from 'lucide-react';
import { format } from 'date-fns';
import type { LeaveListItem } from '@/features/leaves/types';
import { LEAVE_TYPE_OPTIONS, LEAVE_STATUS_OPTIONS } from './options';
import { LeaveCellAction } from './cell-action';

const formatDate = (value: string) => format(new Date(value), 'MMM dd, yyyy');

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'REJECTED':
      return 'destructive';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-500 text-white';
    case 'PENDING':
      return 'bg-yellow-500 text-white';
    case 'REJECTED':
      return 'bg-red-500 text-white';
    case 'CANCELLED':
      return 'bg-gray-500 text-white';
    default:
      return '';
  }
};

export const columns: ColumnDef<LeaveListItem>[] = [
  {
    id: 'name',
    accessorKey: 'userName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Employee' />
    ),
    cell: ({ row }) => {
      const { userName, userEmail } = row.original;
      return (
        <div className='flex items-center gap-3'>
          <div>
            <p className='text-foreground text-sm font-medium'>
              {userName || 'Unnamed user'}
            </p>
            <p className='text-muted-foreground text-xs'>{userEmail}</p>
          </div>
        </div>
      );
    },
    meta: {
      label: 'Employee',
      placeholder: 'Search employees...',
      variant: 'autocomplete',
      icon: User,
      searchEndpoint: '/api/users/search'
    },
    enableColumnFilter: true
  },
  {
    id: 'leaveType',
    accessorKey: 'leaveType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Leave Type' />
    ),
    cell: ({ row }) => {
      const leaveType = row.original.leaveType.replace(/_/g, ' ').toLowerCase();
      return (
        <Badge variant='outline' className='capitalize'>
          {leaveType}
        </Badge>
      );
    },
    meta: {
      label: 'Leave Type',
      variant: 'multiSelect',
      options: LEAVE_TYPE_OPTIONS,
      icon: CalendarDays
    },
    enableColumnFilter: true
  },
  {
    id: 'dateRange',
    header: 'Date Range',
    cell: ({ row }) => {
      const { startDate, endDate, isHalfDay, halfDayType } = row.original;
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      const isSameDay = start === end;

      if (isSameDay && isHalfDay) {
        const halfDayText =
          halfDayType === 'FIRST_HALF' ? 'First Half' : 'Second Half';
        return (
          <div className='text-sm'>
            <p className='text-foreground'>{start}</p>
            <p className='text-muted-foreground text-xs'>{halfDayText}</p>
          </div>
        );
      }

      return (
        <div className='text-sm'>
          <p className='text-foreground'>{start}</p>
          {!isSameDay && (
            <p className='text-muted-foreground text-xs'>to {end}</p>
          )}
        </div>
      );
    }
  },
  {
    id: 'totalDays',
    accessorKey: 'totalDays',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Days' />
    ),
    cell: ({ row }) => {
      const days = row.original.totalDays;
      return (
        <span className='text-sm font-medium'>
          {days === 0.5 ? '0.5' : days.toString()}
        </span>
      );
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
      const statusLabel = status.replace(/_/g, ' ').toLowerCase();
      return (
        <Badge
          variant={getStatusVariant(status)}
          className={cn('capitalize', getStatusColor(status))}
        >
          {statusLabel}
        </Badge>
      );
    },
    meta: {
      label: 'Status',
      variant: 'multiSelect',
      options: LEAVE_STATUS_OPTIONS,
      icon: CalendarDays
    },
    enableColumnFilter: true
  },
  {
    id: 'approvedBy',
    accessorKey: 'approvedByName',
    header: 'Approved By',
    cell: ({ row }) => {
      const { approvedByName, approvedAt } = row.original;
      if (!approvedByName) {
        return <span className='text-muted-foreground text-sm'>—</span>;
      }
      return (
        <div className='text-sm'>
          <p className='text-foreground'>{approvedByName}</p>
          {approvedAt && (
            <p className='text-muted-foreground text-xs'>
              {formatDate(approvedAt)}
            </p>
          )}
        </div>
      );
    }
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Applied On' />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <CalendarDays className='text-muted-foreground/70 h-4 w-4' />
        <span>{formatDate(row.original.createdAt)}</span>
      </div>
    ),
    meta: {
      label: 'Applied date',
      placeholder: 'Filter by applied date',
      variant: 'date'
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <LeaveCellAction data={row.original} />
  }
];
