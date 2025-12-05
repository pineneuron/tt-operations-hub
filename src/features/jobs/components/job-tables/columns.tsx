'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, Users, AlertCircle, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { JobListItem } from '@/features/jobs/types';
import { JOB_STATUS_OPTIONS, JOB_PRIORITY_OPTIONS } from './options';
import { JobCellAction } from './cell-action';
import type { JobPriority } from '@prisma/client';

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'MMM dd, yyyy') : '-';
const formatDateTime = (value: string | null) =>
  value ? format(new Date(value), 'MMM dd, yyyy hh:mm a') : '-';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'IN_REVIEW':
      return 'default';
    case 'BLOCKED':
      return 'destructive';
    case 'COMPLETED':
      return 'default';
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-gray-500 text-white';
    case 'IN_PROGRESS':
      return 'bg-blue-500 text-white';
    case 'IN_REVIEW':
      return 'bg-yellow-500 text-white';
    case 'BLOCKED':
      return 'bg-red-500 text-white';
    case 'COMPLETED':
      return 'bg-emerald-500 text-white';
    default:
      return '';
  }
};

const getPriorityColor = (priority: JobPriority | null) => {
  if (!priority) return '';
  switch (priority) {
    case 'URGENT':
      return 'bg-red-500 text-white';
    case 'HIGH':
      return 'bg-orange-500 text-white';
    case 'MEDIUM':
      return 'bg-yellow-500 text-white';
    case 'LOW':
      return 'bg-blue-500 text-white';
    default:
      return '';
  }
};

export const columns: ColumnDef<JobListItem>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Job' />
    ),
    cell: ({ row }) => (
      <div className='flex min-w-0 flex-col'>
        <Link
          href={`/dashboard/jobs/${row.original.id}`}
          className='text-foreground font-medium hover:underline'
        >
          {row.original.title}
        </Link>
        {row.original.remarks && (
          <span className='text-muted-foreground mt-0.5 line-clamp-1 text-xs'>
            {row.original.remarks}
          </span>
        )}
        {row.original.eventTitle && (
          <div className='mt-0.5 flex items-center gap-1'>
            <Briefcase className='text-muted-foreground h-3 w-3' />
            <span className='text-muted-foreground text-xs'>
              {row.original.eventTitle}
            </span>
          </div>
        )}
      </div>
    ),
    enableColumnFilter: true,
    meta: {
      label: 'Job title',
      placeholder: 'Filter by job title...',
      variant: 'text'
    }
  },
  {
    id: 'priority',
    accessorKey: 'priority',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Priority' />
    ),
    cell: ({ row }) => {
      const priority = row.original.priority;
      if (!priority)
        return <span className='text-muted-foreground text-sm'>-</span>;
      const priorityOption = JOB_PRIORITY_OPTIONS.find(
        (opt) => opt.value === priority
      );
      return (
        <Badge className={cn(getPriorityColor(priority))}>
          {priorityOption?.label || priority}
        </Badge>
      );
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    meta: {
      label: 'Priority',
      placeholder: 'Select priorities...',
      variant: 'multiSelect',
      options: [...JOB_PRIORITY_OPTIONS]
    }
  },
  {
    id: 'assignees',
    accessorKey: 'assigneeCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Assignees' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Users className='text-muted-foreground h-4 w-4' />
        <span className='text-sm'>{row.original.assigneeCount}</span>
      </div>
    )
  },
  {
    id: 'dueDate',
    accessorKey: 'dueDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Due Date' />
    ),
    cell: ({ row }) => {
      const dueDate = row.original.dueDate;
      const isOverdue =
        dueDate &&
        new Date(dueDate) < new Date() &&
        row.original.status !== 'COMPLETED';
      return (
        <div className='flex items-center gap-2'>
          <CalendarDays
            className={cn(
              'h-4 w-4',
              isOverdue ? 'text-red-500' : 'text-muted-foreground'
            )}
          />
          <span
            className={cn('text-sm', isOverdue && 'font-medium text-red-500')}
          >
            {formatDateTime(dueDate)}
          </span>
          {isOverdue && <AlertCircle className='h-3 w-3 text-red-500' />}
        </div>
      );
    },
    meta: {
      label: 'Due date',
      placeholder: 'Filter by due date',
      variant: 'date'
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
      options: [...JOB_STATUS_OPTIONS]
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <JobCellAction data={row.original} />
  }
];
