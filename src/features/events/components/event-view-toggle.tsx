'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewType = 'table' | 'calendar';

export function EventViewToggle() {
  const [view, setView] = useQueryState(
    'view',
    parseAsString.withDefault('table').withOptions({
      clearOnDefault: true
    })
  ) as [ViewType, (value: ViewType) => void];

  return (
    <div className='flex items-center gap-1 rounded-md border p-1'>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setView('table')}
        className={cn('h-8 px-3', view === 'table' && 'bg-accent')}
      >
        <LayoutGrid className='mr-2 h-4 w-4' />
        Table
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setView('calendar')}
        className={cn('h-8 px-3', view === 'calendar' && 'bg-accent')}
      >
        <CalendarIcon className='mr-2 h-4 w-4' />
        Calendar
      </Button>
    </div>
  );
}
