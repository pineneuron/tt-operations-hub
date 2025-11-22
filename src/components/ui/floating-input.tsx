'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface FloatingInputProps extends React.ComponentProps<'input'> {
  label: string;
  error?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, id, value, ...props }, ref) => {
    const inputId = id || `floating-input-${React.useId()}`;
    const [isFocused, setIsFocused] = React.useState(false);
    const hasValue = value !== undefined && value !== null && value !== '';

    return (
      <div className='relative'>
        <Input
          id={inputId}
          ref={ref}
          value={value}
          className={cn(
            'peer h-11 pt-6 pb-2',
            error && 'border-destructive aria-invalid:border-destructive',
            className
          )}
          placeholder=' '
          aria-invalid={error ? 'true' : 'false'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute left-3 origin-left transition-all duration-200 ease-in-out',
            'text-muted-foreground',
            hasValue || isFocused
              ? 'text-foreground top-3 scale-100 text-xs'
              : 'top-1/2 -translate-y-1/2 scale-100 text-base',
            error && 'text-destructive'
          )}
        >
          {label}
        </label>
        {error && <p className='text-destructive mt-1 px-3 text-sm'>{error}</p>}
      </div>
    );
  }
);

FloatingInput.displayName = 'FloatingInput';

export { FloatingInput };
