'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, MapPin, Truck, User } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { TransportationEntryListItem } from '@/features/transportation/types';
import {
  TRANSPORTATION_TYPE_OPTIONS,
  DELIVERY_STATUS_OPTIONS
} from './options';
import { TransportationEntryCellAction } from './entry-cell-action';

const formatDateTime = (value: string) =>
  format(new Date(value), 'MMM dd, yyyy hh:mm a');

const getDeliveryStatusColor = (status: string | null) => {
  if (!status) return '';
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-500 text-white';
    case 'IN_TRANSIT':
      return 'bg-orange-500 text-white';
    case 'DELIVERED':
      return 'bg-emerald-500 text-white';
    case 'FAILED':
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

export const entryColumns: ColumnDef<TransportationEntryListItem>[] = [
  {
    id: 'vehicle',
    accessorKey: 'vehicleNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Vehicle' />
    ),
    cell: ({ row }) => (
      <div className='flex min-w-0 flex-col'>
        <div className='flex items-center gap-2'>
          <Truck className='text-muted-foreground h-4 w-4' />
          <Link
            href={`/dashboard/transportation/entries/${row.original.id}`}
            className='text-foreground font-medium hover:underline'
          >
            {row.original.vehicleNumber}
          </Link>
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs'>
          <Badge variant='outline' className='text-xs font-medium uppercase'>
            {getTypeLabel(row.original.type)}
          </Badge>
          {row.original.bookingTitle && (
            <Badge variant='secondary' className='text-xs'>
              {row.original.bookingTitle}
            </Badge>
          )}
        </div>
      </div>
    ),
    enableColumnFilter: true,
    meta: {
      label: 'Vehicle number',
      placeholder: 'Filter by vehicle number...',
      variant: 'text'
    }
  },
  {
    id: 'driver',
    accessorKey: 'driverName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Driver' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <User className='text-muted-foreground h-3.5 w-3.5' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm'>{row.original.driverName}</span>
          {row.original.driverPhone && (
            <span className='text-muted-foreground text-xs'>
              {row.original.driverPhone}
            </span>
          )}
        </div>
      </div>
    )
  },
  {
    id: 'deliveryStatus',
    accessorKey: 'deliveryStatus',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Delivery Status' />
    ),
    cell: ({ row }) => {
      if (!row.original.deliveryStatus)
        return <span className='text-sm'>-</span>;
      return (
        <Badge
          className={cn(
            'text-xs font-medium uppercase',
            getDeliveryStatusColor(row.original.deliveryStatus)
          )}
        >
          {row.original.deliveryStatus.replace('_', ' ')}
        </Badge>
      );
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const status = row.getValue(id);
      if (!status) return value.includes(null);
      return value.includes(status);
    },
    meta: {
      label: 'Delivery Status',
      placeholder: 'Select statuses...',
      variant: 'multiSelect',
      options: [...DELIVERY_STATUS_OPTIONS]
    }
  },
  {
    id: 'pickup',
    accessorKey: 'actualPickupLocation',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pickup' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <MapPin className='text-muted-foreground h-3.5 w-3.5' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm'>{row.original.actualPickupLocation}</span>
          <span className='text-muted-foreground text-xs'>
            {format(new Date(row.original.actualPickupDate), 'MMM dd, yyyy')}
          </span>
        </div>
      </div>
    )
  },
  {
    id: 'dropoff',
    accessorKey: 'actualDropoffLocation',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Dropoff' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <MapPin className='text-muted-foreground h-3.5 w-3.5' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm'>{row.original.actualDropoffLocation}</span>
          {row.original.actualDropoffDate && (
            <span className='text-muted-foreground text-xs'>
              {format(new Date(row.original.actualDropoffDate), 'MMM dd, yyyy')}
            </span>
          )}
        </div>
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
    cell: ({ row }) => <TransportationEntryCellAction entry={row.original} />
  }
];
