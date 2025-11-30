'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, User, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { AttendanceHistoryItem } from '@/features/attendance/types';
import { WORK_LOCATION_OPTIONS, ATTENDANCE_STATUS_OPTIONS } from './options';
import { AttendanceCellAction } from './cell-action';

const formatDate = (value: string) => format(new Date(value), 'MMM dd, yyyy');
const formatTime = (value: string) => format(new Date(value), 'hh:mm a');

// Format late time as hours and minutes (e.g., "1 hour 10 minutes")
const formatLateTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }
};

// Format early check-in time as minutes and seconds (e.g., "9 minutes 23 seconds")
const formatEarlyTime = (
  checkInTime: string,
  expectedCheckInTime: string | null
): string | null => {
  if (!expectedCheckInTime) return null;

  const checkIn = new Date(checkInTime);
  const expected = new Date(expectedCheckInTime);

  // If check-in is before expected time, it's early
  if (checkIn < expected) {
    const diffMs = expected.getTime() - checkIn.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0 && seconds > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }

  return null;
};

// Format hours worked as hours and minutes (e.g., "8 hours 30 minutes")
const formatHoursWorked = (hours: number): string => {
  const totalHours = Math.floor(hours);
  const minutes = Math.round((hours - totalHours) * 60);

  if (totalHours > 0 && minutes > 0) {
    return `${totalHours} hour${totalHours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (totalHours > 0) {
    return `${totalHours} hour${totalHours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return '0 minutes';
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ON_TIME':
      return 'default';
    case 'LATE':
      return 'secondary';
    case 'ABSENT':
      return 'destructive';
    case 'HALF_DAY':
      return 'outline';
    case 'AUTO_CHECKED_OUT':
      return 'outline';
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ON_TIME':
      return 'bg-emerald-500 text-white';
    case 'LATE':
      return 'bg-yellow-500 text-white';
    case 'ABSENT':
      return 'bg-red-500 text-white';
    case 'HALF_DAY':
      return 'bg-blue-500 text-white';
    case 'AUTO_CHECKED_OUT':
      return 'bg-gray-500 text-white';
    default:
      return '';
  }
};

const getLocationBadgeStyle = (location: string) => {
  switch (location) {
    case 'OFFICE':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-none';
    case 'SITE':
      return 'bg-orange-500 text-white hover:bg-orange-600 border-none';
    default:
      return '';
  }
};

export const columns: ColumnDef<AttendanceHistoryItem>[] = [
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
      searchEndpoint: '/api/users/search',
      icon: User
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
    id: 'workLocation',
    accessorKey: 'workLocation',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Location' />
    ),
    cell: ({ row }) => {
      const workLocation = row.original.workLocation;
      const location = workLocation.replace(/_/g, ' ').toLowerCase();
      const badgeStyle = getLocationBadgeStyle(workLocation);
      return (
        <Badge variant='outline' className={cn('capitalize', badgeStyle)}>
          {location}
        </Badge>
      );
    },
    meta: {
      label: 'Work Location',
      variant: 'multiSelect',
      options: WORK_LOCATION_OPTIONS,
      icon: MapPin
    },
    enableColumnFilter: true
  },
  {
    id: 'checkInTime',
    accessorKey: 'checkInTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Check-In' />
    ),
    cell: ({ row }) => {
      const { checkInTime, isLate, lateMinutes, expectedCheckInTime } =
        row.original;
      const earlyTime = formatEarlyTime(checkInTime, expectedCheckInTime);

      return (
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <Clock className='text-muted-foreground h-3 w-3' />
            <span className='text-sm'>{formatTime(checkInTime)}</span>
          </div>
          {isLate && lateMinutes !== null && (
            <span className='text-xs text-yellow-600'>
              {formatLateTime(lateMinutes)} late
            </span>
          )}
          {!isLate && earlyTime && (
            <span className='text-xs text-emerald-600'>
              Early by {earlyTime}
            </span>
          )}
        </div>
      );
    }
  },
  {
    id: 'checkOutTime',
    accessorKey: 'checkOutTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Check-Out' />
    ),
    cell: ({ row }) => {
      const { checkOutTime, autoCheckedOut } = row.original;
      if (!checkOutTime) {
        return <span className='text-muted-foreground text-sm'>—</span>;
      }
      return (
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <Clock className='text-muted-foreground h-3 w-3' />
            <span className='text-sm'>{formatTime(checkOutTime)}</span>
          </div>
          {autoCheckedOut && (
            <span className='text-xs text-gray-500'>Auto</span>
          )}
        </div>
      );
    }
  },
  {
    id: 'totalHours',
    accessorKey: 'totalHours',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Hours' />
    ),
    cell: ({ row }) => {
      const hours = row.original.totalHours;
      if (hours === null) {
        return <span className='text-muted-foreground text-sm'>—</span>;
      }
      return <span className='text-sm'>{formatHoursWorked(hours)}</span>;
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
      options: ATTENDANCE_STATUS_OPTIONS,
      icon: CalendarDays
    },
    enableColumnFilter: true
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <AttendanceCellAction data={row.original} />
  }
];
