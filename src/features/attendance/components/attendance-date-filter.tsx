'use client';

import * as React from 'react';
import { PlusCircle, XCircle } from 'lucide-react';
import { CheckIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { DateRange } from 'react-day-picker';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format
} from 'date-fns';
import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { cn } from '@/lib/utils';

type DatePreset =
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'this-year'
  | 'last-month'
  | string
  | null;

interface AttendanceDateFilterProps {
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export function AttendanceDateFilter({
  onDateRangeChange
}: AttendanceDateFilterProps) {
  const [datePreset, setDatePreset] = useQueryState(
    'datePreset',
    parseAsString
  );
  const [dateFrom, setDateFrom] = useQueryState('dateFrom', parseAsString);
  const [dateTo, setDateTo] = useQueryState('dateTo', parseAsString);
  const [open, setOpen] = React.useState(false);
  const prevDateParams = React.useRef({ dateFrom, dateTo, datePreset });

  // Trigger refresh when date params change (for server component to re-fetch)
  React.useEffect(() => {
    // Only trigger if params actually changed
    const hasChanged =
      prevDateParams.current.dateFrom !== dateFrom ||
      prevDateParams.current.dateTo !== dateTo ||
      prevDateParams.current.datePreset !== datePreset;

    if (hasChanged) {
      prevDateParams.current = { dateFrom, dateTo, datePreset };
      // Small delay to ensure URL params are updated by useQueryState
      const timeoutId = setTimeout(() => {
        if (onDateRangeChange) {
          onDateRangeChange(undefined); // Just trigger refresh
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [dateFrom, dateTo, datePreset, onDateRangeChange]);

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse date string without timezone issues
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getDateRange = React.useCallback(
    (preset: DatePreset): DateRange | undefined => {
      if (!preset) return undefined;

      const today = new Date();

      switch (preset) {
        case 'today':
          return {
            from: startOfDay(today),
            to: endOfDay(today)
          };
        case 'this-week':
          return {
            from: startOfWeek(today, { weekStartsOn: 0 }), // Sunday
            to: endOfWeek(today, { weekStartsOn: 0 })
          };
        case 'this-month':
          return {
            from: startOfMonth(today),
            to: endOfMonth(today)
          };
        case 'this-year':
          return {
            from: startOfYear(today),
            to: endOfYear(today)
          };
        case 'last-month':
          const lastMonth = subMonths(today, 1);
          return {
            from: startOfMonth(lastMonth),
            to: endOfMonth(lastMonth)
          };
        default:
          // Handle month presets like "2024-01" (YYYY-MM format)
          if (typeof preset === 'string' && /^\d{4}-\d{2}$/.test(preset)) {
            const [year, month] = preset.split('-').map(Number);
            const monthDate = new Date(year, month - 1, 1);
            return {
              from: startOfMonth(monthDate),
              to: endOfMonth(monthDate)
            };
          }
          return undefined;
      }
    },
    []
  );

  const selectedRange = React.useMemo(() => {
    // For presets, if we have dateFrom/dateTo, use those (they're set when preset is selected)
    if (dateFrom && dateTo) {
      return {
        from: parseDateString(dateFrom),
        to: parseDateString(dateTo)
      };
    }

    // Otherwise, if we have a preset, calculate the range
    if (datePreset) {
      return getDateRange(datePreset as DatePreset);
    }
    return undefined;
  }, [datePreset, dateFrom, dateTo, getDateRange]);

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset) {
      const range = getDateRange(preset);
      if (range) {
        // Set the dateFrom and dateTo based on the preset range
        // Use formatDateString helper to avoid timezone issues
        setDateFrom(range.from ? formatDateString(range.from) : null);
        setDateTo(range.to ? formatDateString(range.to) : null);
        setDatePreset(preset);
        setOpen(false);
        // The useEffect will trigger the refresh automatically
      }
    } else {
      // Clear all
      setDatePreset(null);
      setDateFrom(null);
      setDateTo(null);
      setOpen(false);
      // The useEffect will trigger the refresh automatically
    }
  };

  const handleClear = () => {
    setDatePreset(null);
    setDateFrom(null);
    setDateTo(null);
    // The useEffect will trigger the refresh automatically
  };

  const hasValue = selectedRange && (selectedRange.from || selectedRange.to);
  const presetLabel = React.useMemo(() => {
    if (!datePreset) return null;
    switch (datePreset) {
      case 'today':
        return 'Today';
      case 'this-week':
        return 'This Week';
      case 'this-month':
        return 'This Month';
      case 'this-year':
        return 'This Year';
      case 'last-month':
        return 'Last Month';
      default:
        // Handle month presets like "2024-01" (YYYY-MM format)
        if (
          typeof datePreset === 'string' &&
          /^\d{4}-\d{2}$/.test(datePreset)
        ) {
          const [year, month] = datePreset.split('-').map(Number);
          const monthDate = new Date(year, month - 1, 1);
          return format(monthDate, 'MMMM yyyy'); // e.g., "January 2024"
        }
        return null;
    }
  }, [datePreset]);

  // Generate list of previous months (only from current year)
  const previousMonths = React.useMemo(() => {
    const months: Array<{ value: string; label: string; date: Date }> = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Only add past months from the current year
    for (let i = currentMonth - 1; i >= 0; i--) {
      const monthDate = new Date(currentYear, i, 1);
      const value = format(monthDate, 'yyyy-MM'); // e.g., "2025-01"
      const label = format(monthDate, 'MMMM yyyy'); // e.g., "January 2025"
      months.push({ value, label, date: monthDate });
    }

    return months;
  }, []);

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      handleClear();
    },
    [handleClear]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='border-dashed'>
          {hasValue ? (
            <div
              role='button'
              aria-label='Clear date filter'
              tabIndex={0}
              onClick={onReset}
              className='focus-visible:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:outline-none'
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          Date Range
          {hasValue && presetLabel && (
            <>
              <Separator
                orientation='vertical'
                className='mx-0.5 data-[orientation=vertical]:h-4'
              />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal'
              >
                {presetLabel}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Command>
          <CommandList>
            <CommandGroup heading='Current Period'>
              <CommandItem
                onSelect={() => handlePresetSelect('today')}
                className={cn(
                  'cursor-pointer',
                  datePreset === 'today' && 'bg-accent'
                )}
              >
                <div
                  className={cn(
                    'border-primary flex size-4 items-center justify-center rounded-sm border',
                    datePreset === 'today'
                      ? 'bg-primary'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <CheckIcon />
                </div>
                Today
              </CommandItem>
              <CommandItem
                onSelect={() => handlePresetSelect('this-week')}
                className={cn(
                  'cursor-pointer',
                  datePreset === 'this-week' && 'bg-accent'
                )}
              >
                <div
                  className={cn(
                    'border-primary flex size-4 items-center justify-center rounded-sm border',
                    datePreset === 'this-week'
                      ? 'bg-primary'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <CheckIcon />
                </div>
                This Week
              </CommandItem>
              <CommandItem
                onSelect={() => handlePresetSelect('this-month')}
                className={cn(
                  'cursor-pointer',
                  datePreset === 'this-month' && 'bg-accent'
                )}
              >
                <div
                  className={cn(
                    'border-primary flex size-4 items-center justify-center rounded-sm border',
                    datePreset === 'this-month'
                      ? 'bg-primary'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <CheckIcon />
                </div>
                This Month
              </CommandItem>
              <CommandItem
                onSelect={() => handlePresetSelect('this-year')}
                className={cn(
                  'cursor-pointer',
                  datePreset === 'this-year' && 'bg-accent'
                )}
              >
                <div
                  className={cn(
                    'border-primary flex size-4 items-center justify-center rounded-sm border',
                    datePreset === 'this-year'
                      ? 'bg-primary'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <CheckIcon />
                </div>
                This Year
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Previous Months'>
              {previousMonths.map((month) => (
                <CommandItem
                  key={month.value}
                  onSelect={() => handlePresetSelect(month.value)}
                  className={cn(
                    'cursor-pointer',
                    datePreset === month.value && 'bg-accent'
                  )}
                >
                  <div
                    className={cn(
                      'border-primary flex size-4 items-center justify-center rounded-sm border',
                      datePreset === month.value
                        ? 'bg-primary'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <CheckIcon />
                  </div>
                  {month.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {hasValue && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      handleClear();
                      setOpen(false);
                    }}
                    className='cursor-pointer justify-center text-center'
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
