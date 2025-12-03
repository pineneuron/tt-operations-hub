'use client';

import * as React from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { ChevronsUpDown } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
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
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { BaseFormFieldProps } from '@/types/base-form';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
}

interface FormAutocompleteProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  placeholder?: string;
  searchEndpoint?: string;
}

export function FormAutocomplete<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required,
  placeholder = 'Search...',
  searchEndpoint = '/api/users/search',
  disabled,
  className
}: FormAutocompleteProps<TFieldValues, TName>) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

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
        const currentSelectedUser =
          selectedUser || users.find((u) => u.id === field.value) || null;

        const displayValue = currentSelectedUser
          ? currentSelectedUser.name || currentSelectedUser.email
          : '';

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
                      'w-full justify-between',
                      !field.value && 'text-muted-foreground'
                    )}
                    disabled={disabled}
                  >
                    {displayValue || placeholder}
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
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name || ''} ${user.email} ${user.username || ''}`}
                          onSelect={() => {
                            field.onChange(user.id);
                            setSelectedUser(user);
                            setOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <Checkbox
                            checked={field.value === user.id}
                            className='mr-2'
                            onCheckedChange={() => field.onChange(user.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className='flex flex-col'>
                            <span>{user.name || 'Unnamed user'}</span>
                            <span className='text-muted-foreground text-xs'>
                              {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
