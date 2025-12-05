'use client';

import { FieldPath, FieldValues } from 'react-hook-form';
import { Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';
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
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { BaseFormFieldProps } from '@/types/base-form';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FormTimePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  placeholder?: string;
}

function FormTimePicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required,
  placeholder = 'Select time',
  disabled,
  className
}: FormTimePickerProps<TFieldValues, TName>) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Convert 24-hour format to 12-hour format for display/selection
        const [hour24, minute] = field.value
          ? field.value.split(':').map(Number)
          : [null, null];

        // Convert to 12-hour format
        const hour12 =
          hour24 !== null
            ? hour24 === 0
              ? 12
              : hour24 > 12
                ? hour24 - 12
                : hour24
            : null;
        const ampm = hour24 !== null ? (hour24 >= 12 ? 'PM' : 'AM') : null;

        const handleTimeSelect = (
          selectedHour12: number,
          selectedMinute: number,
          selectedAmPm: 'AM' | 'PM'
        ) => {
          // Convert 12-hour to 24-hour format
          let hour24 = selectedHour12;
          if (selectedAmPm === 'PM' && selectedHour12 !== 12) {
            hour24 = selectedHour12 + 12;
          } else if (selectedAmPm === 'AM' && selectedHour12 === 12) {
            hour24 = 0;
          }

          const timeString = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
          field.onChange(timeString);
        };

        const displayValue = field.value
          ? (() => {
              const [h, m] = field.value.split(':').map(Number);
              const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
              const ampm = h >= 12 ? 'PM' : 'AM';
              return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
            })()
          : null;

        return (
          <FormItem className={`flex flex-col ${className}`}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className='ml-1 text-red-500'>*</span>}
              </FormLabel>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant='outline'
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                    disabled={disabled}
                    type='button'
                  >
                    {displayValue ? (
                      <span>{displayValue}</span>
                    ) : (
                      <span>{placeholder}</span>
                    )}
                    <Clock className='ml-auto h-4 w-4 opacity-50' />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <TimePickerContent
                  hours={hours}
                  minutes={minutes}
                  selectedHour={hour12}
                  selectedMinute={minute}
                  selectedAmPm={ampm as 'AM' | 'PM' | null}
                  onTimeSelect={handleTimeSelect}
                />
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

interface TimePickerContentProps {
  hours: number[];
  minutes: number[];
  selectedHour: number | null;
  selectedMinute: number | null;
  selectedAmPm: 'AM' | 'PM' | null;
  onTimeSelect: (hour: number, minute: number, amPm: 'AM' | 'PM') => void;
}

function TimePickerContent({
  hours,
  minutes,
  selectedHour,
  selectedMinute,
  selectedAmPm,
  onTimeSelect
}: TimePickerContentProps) {
  const hourContainerRef = useRef<HTMLDivElement>(null);
  const minuteContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedHour !== null && hourContainerRef.current) {
      const hourElement = hourContainerRef.current.querySelector(
        `[data-hour="${selectedHour}"]`
      );
      if (hourElement) {
        hourElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedHour]);

  useEffect(() => {
    if (selectedMinute !== null && minuteContainerRef.current) {
      const minuteElement = minuteContainerRef.current.querySelector(
        `[data-minute="${selectedMinute}"]`
      );
      if (minuteElement) {
        minuteElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedMinute]);

  const currentAmPm = selectedAmPm ?? 'AM';

  useEffect(() => {
    // Enable mouse wheel scrolling for hours
    const hourViewport = hourContainerRef.current?.closest(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement;
    if (hourViewport) {
      const handleWheel = (e: WheelEvent) => {
        hourViewport.scrollTop += e.deltaY;
        e.preventDefault();
      };
      hourViewport.addEventListener('wheel', handleWheel, { passive: false });
      return () => hourViewport.removeEventListener('wheel', handleWheel);
    }
  }, []);

  useEffect(() => {
    // Enable mouse wheel scrolling for minutes
    const minuteViewport = minuteContainerRef.current?.closest(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement;
    if (minuteViewport) {
      const handleWheel = (e: WheelEvent) => {
        minuteViewport.scrollTop += e.deltaY;
        e.preventDefault();
      };
      minuteViewport.addEventListener('wheel', handleWheel, { passive: false });
      return () => minuteViewport.removeEventListener('wheel', handleWheel);
    }
  }, []);

  return (
    <div className='flex'>
      {/* Hours (1-12) */}
      <ScrollArea className='h-64 w-16'>
        <div className='p-2' ref={hourContainerRef}>
          {hours.map((h) => (
            <button
              key={h}
              type='button'
              data-hour={h}
              onClick={() => onTimeSelect(h, selectedMinute ?? 0, currentAmPm)}
              className={cn(
                'hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-sm transition-colors',
                selectedHour === h && 'bg-primary text-primary-foreground'
              )}
            >
              {String(h).padStart(2, '0')}
            </button>
          ))}
        </div>
        <ScrollBar className='w-1' />
      </ScrollArea>

      {/* Minutes */}
      <ScrollArea className='h-64 w-16 border-l'>
        <div className='p-2' ref={minuteContainerRef}>
          {minutes.map((m) => (
            <button
              key={m}
              type='button'
              data-minute={m}
              onClick={() => onTimeSelect(selectedHour ?? 1, m, currentAmPm)}
              className={cn(
                'hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-sm transition-colors',
                selectedMinute === m && 'bg-primary text-primary-foreground'
              )}
            >
              {String(m).padStart(2, '0')}
            </button>
          ))}
        </div>
        <ScrollBar className='w-1' />
      </ScrollArea>

      {/* AM/PM */}
      <div className='flex flex-col border-l'>
        <button
          type='button'
          onClick={() =>
            onTimeSelect(selectedHour ?? 1, selectedMinute ?? 0, 'AM')
          }
          className={cn(
            'hover:bg-accent hover:text-accent-foreground rounded-t-md border-b px-3 py-2 text-sm transition-colors',
            currentAmPm === 'AM' && 'bg-primary text-primary-foreground'
          )}
        >
          AM
        </button>
        <button
          type='button'
          onClick={() =>
            onTimeSelect(selectedHour ?? 1, selectedMinute ?? 0, 'PM')
          }
          className={cn(
            'hover:bg-accent hover:text-accent-foreground rounded-b-md px-3 py-2 text-sm transition-colors',
            currentAmPm === 'PM' && 'bg-primary text-primary-foreground'
          )}
        >
          PM
        </button>
      </div>
    </div>
  );
}

export { FormTimePicker };
