'use client';

import { Button } from '@/components/ui/button';
import { useUserModal } from '@/features/users/hooks/use-user-modal';
import { IconPlus } from '@tabler/icons-react';

export function UserPageActions() {
  const openCreate = useUserModal((state) => state.openCreate);

  return (
    <Button type='button' className='text-xs md:text-sm' onClick={openCreate}>
      <IconPlus className='h-4 w-4' />
      Add New
    </Button>
  );
}
