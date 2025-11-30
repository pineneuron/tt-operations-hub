'use client';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useHolidayModal } from '@/features/holidays/hooks/use-holiday-modal';

export function HolidayPageActions() {
  const { openCreate } = useHolidayModal();

  return (
    <Button type='button' className='text-xs md:text-sm' onClick={openCreate}>
      <IconPlus className='h-4 w-4' />
      Add Holiday
    </Button>
  );
}
