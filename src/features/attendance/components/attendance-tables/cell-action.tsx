'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { AttendanceHistoryItem } from '@/features/attendance/types';
import { IconDotsVertical, IconEye } from '@tabler/icons-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CellActionProps {
  data: AttendanceHistoryItem;
}

export function AttendanceCellAction({ data }: CellActionProps) {
  const [openView, setOpenView] = useState(false);

  const formatDate = (value: string) => format(new Date(value), 'MMM dd, yyyy');
  const formatTime = (value: string) => format(new Date(value), 'hh:mm a');
  const formatDateTime = (value: string) =>
    format(new Date(value), 'MMM dd, yyyy hh:mm a');

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
        return 'bg-emerald-500 bg-hover:bg-emerald-600 text-white';
      case 'LATE':
        return 'bg-yellow-500 bg-hover:bg-yellow-600 text-white';
      case 'ABSENT':
        return 'bg-red-500 bg-hover:bg-red-600 text-white';
      case 'HALF_DAY':
        return 'bg-blue-500 bg-hover:bg-blue-600 text-white';
      case 'AUTO_CHECKED_OUT':
        return 'bg-gray-500 bg-hover:bg-gray-600 text-white';
      default:
        return '';
    }
  };

  const getLocationBadgeStyle = (location: string) => {
    switch (location) {
      case 'OFFICE':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-none border-none';
      case 'SITE':
        return 'bg-orange-500 text-white hover:bg-orange-600 shadow-none border-none';
      default:
        return '';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <IconDotsVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenView(true)}>
            <IconEye className='h-4 w-4' />
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              Complete attendance information for this session
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Employee
                </p>
                <p className='text-sm font-medium'>
                  {data.userName || 'Unnamed user'}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {data.userEmail}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Date
                </p>
                <p className='text-sm font-medium'>{formatDate(data.date)}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Work Location
                </p>
                <Badge
                  variant='outline'
                  className={cn(
                    'mt-1 capitalize',
                    getLocationBadgeStyle(data.workLocation)
                  )}
                >
                  {data.workLocation.replace(/_/g, ' ').toLowerCase()}
                </Badge>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Status
                </p>
                <Badge
                  variant={getStatusVariant(data.status)}
                  className={cn('mt-1 capitalize', getStatusColor(data.status))}
                >
                  {data.status.replace(/_/g, ' ').toLowerCase()}
                </Badge>
              </div>
            </div>

            <div className='border-t pt-4'>
              <h4 className='mb-3 text-sm font-semibold'>Check-In</h4>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-muted-foreground text-sm font-medium'>
                    Time
                  </p>
                  <p className='text-sm'>{formatDateTime(data.checkInTime)}</p>
                </div>
                {data.isLate && data.lateMinutes !== null && (
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Late Duration
                    </p>
                    <p className='text-sm text-yellow-600'>
                      {formatLateTime(data.lateMinutes)}
                    </p>
                  </div>
                )}
                {!data.isLate &&
                  formatEarlyTime(
                    data.checkInTime,
                    data.expectedCheckInTime
                  ) && (
                    <div>
                      <p className='text-muted-foreground text-sm font-medium'>
                        Early Check-In
                      </p>
                      <p className='text-sm text-emerald-600'>
                        Early by{' '}
                        {formatEarlyTime(
                          data.checkInTime,
                          data.expectedCheckInTime
                        )}
                      </p>
                    </div>
                  )}
                {data.checkInLocationAddress && (
                  <div className='col-span-2'>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Location
                    </p>
                    <p className='text-sm'>{data.checkInLocationAddress}</p>
                  </div>
                )}
                {data.lateReason && (
                  <div className='col-span-2'>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Late Reason
                    </p>
                    <p className='text-sm'>{data.lateReason}</p>
                  </div>
                )}
                {data.checkInNotes && (
                  <div className='col-span-2'>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Notes
                    </p>
                    <p className='text-sm'>{data.checkInNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {data.checkOutTime && (
              <div className='border-t pt-4'>
                <h4 className='mb-3 text-sm font-semibold'>Check-Out</h4>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Time
                    </p>
                    <p className='text-sm'>
                      {formatDateTime(data.checkOutTime)}
                    </p>
                    {data.autoCheckedOut && (
                      <Badge variant='outline' className='mt-1 text-xs'>
                        Auto Checked Out
                      </Badge>
                    )}
                  </div>
                  {data.totalHours !== null && (
                    <div>
                      <p className='text-muted-foreground text-sm font-medium'>
                        Total Hours
                      </p>
                      <p className='text-sm font-medium'>
                        {formatHoursWorked(data.totalHours)}
                      </p>
                    </div>
                  )}
                  {data.checkOutLocationAddress && (
                    <div className='col-span-2'>
                      <p className='text-muted-foreground text-sm font-medium'>
                        Location
                      </p>
                      <p className='text-sm'>{data.checkOutLocationAddress}</p>
                    </div>
                  )}
                  {data.checkOutNotes && (
                    <div className='col-span-2'>
                      <p className='text-muted-foreground text-sm font-medium'>
                        Notes
                      </p>
                      <p className='text-sm'>{data.checkOutNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {data.flags && data.flags.length > 0 && (
              <div className='border-t pt-4'>
                <h4 className='mb-3 text-sm font-semibold'>Flags</h4>
                <div className='flex flex-wrap gap-2'>
                  {data.flags.map((flag) => (
                    <Badge key={flag} variant='outline' className='text-xs'>
                      {flag.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenView(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
