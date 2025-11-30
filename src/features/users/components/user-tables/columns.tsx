'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, Mail, Shield } from 'lucide-react';
import { format } from 'date-fns';
import type { UserListItem } from '@/features/users/types';
import { ROLE_OPTIONS } from './options';
import { UserCellAction } from './cell-action';

const formatDate = (value: string) =>
  format(new Date(value), 'MMM dd, yyyy • HH:mm');

export const columns: ColumnDef<UserListItem>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='User' />
    ),
    cell: ({ row }) => {
      const { name, email, image } = row.original;
      const fallback = (name || email || 'U')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return (
        <div className='flex items-center gap-3'>
          <Avatar className='size-10 border'>
            <AvatarImage src={image ?? undefined} alt={name ?? email} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div>
            <p className='text-foreground text-sm font-medium'>
              {name || 'Unnamed user'}
            </p>
            <p className='text-muted-foreground text-xs'>{email}</p>
          </div>
        </div>
      );
    },
    meta: {
      label: 'Name',
      placeholder: 'Search users...',
      variant: 'text',
      icon: Mail
    },
    enableColumnFilter: true
  },
  {
    id: 'username',
    accessorKey: 'username',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Username' />
    ),
    cell: ({ row }) => (
      <span className='text-muted-foreground text-sm'>
        {row.original.username ?? '—'}
      </span>
    )
  },
  {
    id: 'role',
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Role' />
    ),
    cell: ({ row }) => {
      const role = row.original.role.replace(/_/g, ' ').toLowerCase();
      return (
        <Badge variant='outline' className='capitalize'>
          {role}
        </Badge>
      );
    },
    meta: {
      label: 'Roles',
      variant: 'multiSelect',
      options: ROLE_OPTIONS,
      icon: Shield
    },
    enableColumnFilter: true
  },
  {
    id: 'isActive',
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={cn(
            'capitalize',
            isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-foreground'
          )}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      );
    }
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Joined' />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <CalendarDays className='text-muted-foreground/70 h-4 w-4' />
        <span>{formatDate(row.original.createdAt)}</span>
      </div>
    ),
    meta: {
      label: 'Joined date',
      placeholder: 'Filter by joined date',
      variant: 'date'
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <UserCellAction data={row.original} />
  }
];
