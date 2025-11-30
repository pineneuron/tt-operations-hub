'use client';

import * as React from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { CheckIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import type { Column } from '@tanstack/react-table';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
}

interface DataTableAutocompleteFilterProps<TData> {
  column: Column<TData>;
  placeholder?: string;
  searchEndpoint?: string;
}

export function DataTableAutocompleteFilter<TData>({
  column,
  placeholder = 'Search...',
  searchEndpoint = '/api/users/search'
}: DataTableAutocompleteFilterProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const columnFilterValue = column.getFilterValue() as string | undefined;

  // Fetch users when search query changes
  const fetchUsers = React.useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${searchEndpoint}?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [searchEndpoint]
  );

  const debouncedFetchUsers = useDebouncedCallback(fetchUsers, 300);

  // Update search query and fetch users
  React.useEffect(() => {
    if (open && searchQuery) {
      debouncedFetchUsers(searchQuery);
    } else if (!searchQuery) {
      setUsers([]);
    }
  }, [searchQuery, open, debouncedFetchUsers]);

  // Initialize selected user from filter value
  React.useEffect(() => {
    if (
      columnFilterValue &&
      !selectedUser &&
      typeof columnFilterValue === 'string'
    ) {
      // Try to find the user from the filter value
      // This is a simple approach - you might want to fetch the user by ID
      const filterValue = columnFilterValue.toLowerCase();
      const foundUser = users.find(
        (user) =>
          user.name?.toLowerCase().includes(filterValue) ||
          user.email.toLowerCase().includes(filterValue) ||
          user.username?.toLowerCase().includes(filterValue)
      );
      if (foundUser) {
        setSelectedUser(foundUser);
      }
    } else if (!columnFilterValue) {
      setSelectedUser(null);
    }
  }, [columnFilterValue, users, selectedUser]);

  const handleSelect = React.useCallback(
    (user: User) => {
      setSelectedUser(user);
      // Set filter value to user's name or email for server-side filtering
      const filterValue = user.name || user.email;
      column.setFilterValue(filterValue);
      setOpen(false);
      setSearchQuery('');
      setUsers([]);
    },
    [column]
  );

  const handleClear = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setSelectedUser(null);
      column.setFilterValue(undefined);
      setSearchQuery('');
      setUsers([]);
    },
    [column]
  );

  const displayValue = selectedUser
    ? selectedUser.name || selectedUser.email
    : columnFilterValue || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='h-8 w-[200px] justify-between'
        >
          <span className='truncate'>{displayValue || placeholder}</span>
          <div className='flex items-center gap-1'>
            {selectedUser && (
              <div
                role='button'
                tabIndex={0}
                className='flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center opacity-50 hover:opacity-100'
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear(e);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }
                }}
                aria-label='Clear selection'
              >
                <X className='h-4 w-4' />
              </div>
            )}
            <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0' align='start'>
        <Command>
          <CommandInput
            placeholder='Search employees...'
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading && (
              <div className='text-muted-foreground py-6 text-center text-sm'>
                Searching...
              </div>
            )}
            {!loading && users.length === 0 && searchQuery.length >= 2 && (
              <CommandEmpty>No employees found.</CommandEmpty>
            )}
            {!loading && searchQuery.length < 2 && (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            )}
            {!loading && users.length > 0 && (
              <CommandGroup>
                {users.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <CommandItem
                      key={user.id}
                      value={`${user.name || ''} ${user.email} ${user.username || ''}`}
                      onSelect={() => handleSelect(user)}
                    >
                      <div
                        className={cn(
                          'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'bg-primary'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <CheckIcon />
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-sm font-medium'>
                          {user.name || 'Unnamed'}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {user.email}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
