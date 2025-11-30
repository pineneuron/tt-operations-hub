'use client';

import { Button } from '@/components/ui/button';
import { useLeaveModal } from '@/features/leaves/hooks/use-leave-modal';
import { IconPlus } from '@tabler/icons-react';

export function LeavePageActions() {
  const openCreate = useLeaveModal((state) => state.openCreate);

  return (
    <Button type='button' className='text-xs md:text-sm' onClick={openCreate}>
      <IconPlus className='h-4 w-4' />
      Request Leave
    </Button>
  );
}
