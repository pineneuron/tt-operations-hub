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
import { Calendar } from '@/components/ui/calendar';

type DatePreset =
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'this-year'
  | 'last-month'
  | string
  | null;

interface MeetingDateFilterProps {
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export function MeetingDateFilter({
  onDateRangeChange
}: MeetingDateFilterProps) {
  const [datePreset, setDatePreset] = useQueryState(
    'datePreset',
    parseAsString
  );
  const [dateFrom, setDateFrom] = useQueryState('dateFrom', parseAsString);
  const [dateTo, setDateTo] = useQueryState('dateTo', parseAsString);
  const [open, setOpen] = React.useState(false);
  const prevDateParams = React.useRef({ dateFrom, dateTo, datePreset });

  // Trigger refresh when date params change
  React.useEffect(() => {
    const hasChanged =
      prevDateParams.current.dateFrom !== dateFrom ||
      prevDateParams.current.dateTo !== dateTo ||
      prevDateParams.current.datePreset !== datePreset;

    if (hasChanged) {
      prevDateParams.current = { dateFrom, dateTo, datePreset };
      const timeoutId = setTimeout(() => {
        if (onDateRangeChange) {
          onDateRangeChange(undefined);
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [dateFrom, dateTo, datePreset, onDateRangeChange]);

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
            from: startOfWeek(today, { weekStartsOn: 0 }),
            to: endOfWeek(today, { weekStartsOn: 0 })
          };
        case 'this-month':
          return {
            from: startOfMonth(today),
            to: endOfMonth(today)
          };
        case 'last-month':
          const lastMonth = subMonths(today, 1);
          return {
            from: startOfMonth(lastMonth),
            to: endOfMonth(lastMonth)
          };
        case 'this-year':
          return {
            from: startOfYear(today),
            to: endOfYear(today)
          };
        default:
          // Handle month presets like "2024-01"
          if (/^\d{4}-\d{2}$/.test(preset)) {
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

  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (dateFrom && dateTo) {
      return {
        from: parseDateString(dateFrom),
        to: parseDateString(dateTo)
      };
    }
    if (datePreset) {
      return getDateRange(datePreset);
    }
    return undefined;
  }, [dateFrom, dateTo, datePreset, getDateRange]);

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset === datePreset) {
      setDatePreset(null);
      setDateFrom(null);
      setDateTo(null);
    } else {
      setDatePreset(preset);
      const range = getDateRange(preset);
      if (range?.from && range?.to) {
        setDateFrom(formatDateString(range.from));
        setDateTo(formatDateString(range.to));
      }
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDatePreset(null);
      setDateFrom(formatDateString(range.from));
      setDateTo(formatDateString(range.to));
    } else if (range?.from) {
      setDatePreset(null);
      setDateFrom(formatDateString(range.from));
      setDateTo(null);
    } else {
      setDatePreset(null);
      setDateFrom(null);
      setDateTo(null);
    }
  };

  const handleClear = () => {
    setDatePreset(null);
    setDateFrom(null);
    setDateTo(null);
  };

  const hasActiveFilter = datePreset || dateFrom || dateTo;

  const presetOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-year', label: 'This Year' }
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className={cn('h-8 border-dashed', hasActiveFilter && 'border-solid')}
        >
          <PlusCircle className='mr-2 h-4 w-4' />
          Date Range
          {hasActiveFilter && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal'
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }}
              >
                {datePreset
                  ? presetOptions.find((opt) => opt.value === datePreset)
                      ?.label || datePreset
                  : dateFrom && dateTo
                    ? `${format(parseDateString(dateFrom), 'MMM dd')} - ${format(parseDateString(dateTo), 'MMM dd')}`
                    : dateFrom
                      ? `From ${format(parseDateString(dateFrom), 'MMM dd')}`
                      : 'Custom'}
                <XCircle
                  className='ml-1 h-3 w-3'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Command>
          <CommandList>
            <CommandGroup heading='Presets'>
              {presetOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handlePresetSelect(option.value)}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      datePreset === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Custom Range'>
              <div className='p-3'>
                <Calendar
                  mode='range'
                  selected={dateRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                />
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
