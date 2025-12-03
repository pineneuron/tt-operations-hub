'use client';

import * as React from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { ChevronsUpDown, X } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { BaseFormFieldProps } from '@/types/base-form';

interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
}

interface FormMultiAutocompleteProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  placeholder?: string;
  searchEndpoint?: string;
}

export function FormMultiAutocomplete<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required,
  placeholder = 'Search and select...',
  searchEndpoint = '/api/users/search',
  disabled,
  className
}: FormMultiAutocompleteProps<TFieldValues, TName>) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [users, setUsers] = React.useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const prevSelectedIdsRef = React.useRef<string[]>([]);

  const fetchUsers = React.useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const url = new URL(searchEndpoint, window.location.origin);
        url.searchParams.set('q', query);
        const response = await fetch(url.toString());
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

  // Fetch user details for selected IDs
  const fetchSelectedUsers = React.useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) {
      setSelectedUsers([]);
      return;
    }

    try {
      const response = await fetch('/api/users/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: userIds })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch selected users:', error);
    }
  }, []);

  React.useEffect(() => {
    if (open && searchQuery) {
      debouncedFetchUsers(searchQuery);
    } else if (!searchQuery) {
      setUsers([]);
    }
  }, [searchQuery, open, debouncedFetchUsers]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedIds = (field.value as string[]) || [];

        // Update selected users when field value changes (only fetch if IDs actually changed)
        React.useEffect(() => {
          const currentIds = selectedIds.sort().join(',');
          const prevIds = prevSelectedIdsRef.current.sort().join(',');

          if (currentIds !== prevIds) {
            prevSelectedIdsRef.current = selectedIds;
            fetchSelectedUsers(selectedIds);
          }
        }, [selectedIds, fetchSelectedUsers]);

        // Combine selected users from state and current search results
        const allSelectedUsers = React.useMemo(() => {
          const fromState = selectedUsers.filter((u) =>
            selectedIds.includes(u.id)
          );
          const fromSearch = users.filter(
            (u) =>
              selectedIds.includes(u.id) &&
              !fromState.find((s) => s.id === u.id)
          );
          return [...fromState, ...fromSearch];
        }, [selectedUsers, users, selectedIds]);

        const handleSelect = (userId: string) => {
          const currentValues = selectedIds;
          if (currentValues.includes(userId)) {
            field.onChange(currentValues.filter((id) => id !== userId));
          } else {
            field.onChange([...currentValues, userId]);
            // Add to selected users if found in current search
            const user = users.find((u) => u.id === userId);
            if (user && !selectedUsers.find((u) => u.id === userId)) {
              setSelectedUsers((prev) => [...prev, user]);
            }
          }
        };

        const handleRemove = (userId: string) => {
          field.onChange(selectedIds.filter((id) => id !== userId));
          setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
        };

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className='ml-1 text-red-500'>*</span>}
              </FormLabel>
            )}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant='outline'
                    role='combobox'
                    className={cn(
                      'h-auto min-h-10 w-full justify-between',
                      !selectedIds.length && 'text-muted-foreground'
                    )}
                    disabled={disabled}
                  >
                    <div className='flex flex-1 flex-wrap gap-1'>
                      {selectedIds.length > 0 ? (
                        <span className='text-sm'>
                          {selectedIds.length} staff selected
                        </span>
                      ) : (
                        <span>{placeholder}</span>
                      )}
                    </div>
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0' align='start'>
                <Command>
                  <CommandInput
                    placeholder='Search by name or email...'
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loading ? 'Searching...' : 'No users found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => {
                        const isSelected = selectedIds.includes(user.id);
                        return (
                          <CommandItem
                            key={user.id}
                            value={`${user.name || ''} ${user.email} ${user.username || ''}`}
                            onSelect={() => handleSelect(user.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              className='mr-2'
                              onCheckedChange={() => handleSelect(user.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className='flex flex-1 flex-col'>
                              <span>{user.name || 'Unnamed user'}</span>
                              <span className='text-muted-foreground text-xs'>
                                {user.email}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {allSelectedUsers.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {allSelectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant='secondary'
                    className='gap-1 pr-1'
                  >
                    {user.name || user.email}
                    <button
                      type='button'
                      onClick={() => handleRemove(user.id)}
                      className='hover:bg-secondary-foreground/20 ml-1 rounded-full'
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRemove(user.id);
                        }
                      }}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
