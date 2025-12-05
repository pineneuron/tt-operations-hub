'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { TransportationBookingListItem } from '@/features/transportation/types';
import {
  TRANSPORTATION_STATUS_OPTIONS,
  TRANSPORTATION_TYPE_OPTIONS
} from './options';
import { TransportationBookingCellAction } from './booking-cell-action';

const formatDateTime = (value: string) =>
  format(new Date(value), 'MMM dd, yyyy hh:mm a');

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-500 text-white';
    case 'CONFIRMED':
      return 'bg-blue-500 text-white';
    case 'IN_TRANSIT':
      return 'bg-orange-500 text-white';
    case 'COMPLETED':
      return 'bg-emerald-500 text-white';
    case 'CANCELLED':
      return 'bg-red-500 text-white';
    default:
      return '';
  }
};

const getTypeLabel = (type: string) => {
  return (
    TRANSPORTATION_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type
  );
};

export const bookingColumns: ColumnDef<TransportationBookingListItem>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Booking' />
    ),
    cell: ({ row }) => (
      <div className='flex min-w-0 flex-col'>
        <Link
          href={`/dashboard/transportation/bookings/${row.original.id}`}
          className='text-foreground font-medium hover:underline'
        >
          {row.original.title}
        </Link>
        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs'>
          <Badge variant='outline' className='text-xs font-medium uppercase'>
            {getTypeLabel(row.original.type)}
          </Badge>
          {row.original.hasEntry && (
            <Badge variant='secondary' className='text-xs'>
              Entry Linked
            </Badge>
          )}
        </div>
      </div>
    )
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge
        className={cn(
          'text-xs font-medium uppercase',
          getStatusColor(row.original.status)
        )}
      >
        {row.original.status.replace('_', ' ')}
      </Badge>
    ),
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    meta: {
      label: 'Status',
      placeholder: 'Select statuses...',
      variant: 'multiSelect',
      options: [...TRANSPORTATION_STATUS_OPTIONS]
    }
  },
  {
    id: 'pickup',
    accessorKey: 'pickupLocation',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pickup' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <MapPin className='text-muted-foreground h-3.5 w-3.5' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm'>{row.original.pickupLocation}</span>
          <span className='text-muted-foreground text-xs'>
            {format(new Date(row.original.pickupDate), 'MMM dd, yyyy')}
          </span>
        </div>
      </div>
    )
  },
  {
    id: 'dropoff',
    accessorKey: 'dropoffLocation',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Dropoff' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <MapPin className='text-muted-foreground h-3.5 w-3.5' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm'>{row.original.dropoffLocation}</span>
          {row.original.dropoffDate && (
            <span className='text-muted-foreground text-xs'>
              {format(new Date(row.original.dropoffDate), 'MMM dd, yyyy')}
            </span>
          )}
        </div>
      </div>
    )
  },
  {
    id: 'vendor',
    accessorKey: 'vendorSupplierName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Vendor/Supplier' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <User className='text-muted-foreground h-3.5 w-3.5' />
        <span className='text-sm'>
          {row.original.vendorSupplierName || '-'}
        </span>
      </div>
    )
  },
  {
    id: 'createdBy',
    accessorKey: 'createdByName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created By' />
    ),
    cell: ({ row }) => (
      <span className='text-sm'>{row.original.createdByName || '-'}</span>
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <TransportationBookingCellAction booking={row.original} />
    )
  }
];
