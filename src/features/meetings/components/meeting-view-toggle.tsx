'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { Button } from '@/components/ui/button';
import { IconLayoutGrid, IconTable } from '@tabler/icons-react';

export function MeetingViewToggle() {
  const [view, setView] = useQueryState(
    'view',
    parseAsString.withDefault('table').withOptions({
      clearOnDefault: true
    })
  );

  const currentView = view || 'table';

  return (
    <div className='flex items-center gap-1 rounded-md border p-1'>
      <Button
        variant={currentView === 'table' ? 'default' : 'ghost'}
        size='sm'
        onClick={() => setView('table')}
        className='h-8'
      >
        <IconTable className='h-4 w-4' />
      </Button>
      <Button
        variant={currentView === 'calendar' ? 'default' : 'ghost'}
        size='sm'
        onClick={() => setView('calendar')}
        className='h-8'
      >
        <IconLayoutGrid className='h-4 w-4' />
      </Button>
    </div>
  );
}
