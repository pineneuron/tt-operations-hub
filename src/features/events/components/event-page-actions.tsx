'use client';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useEventModal } from '@/features/events/hooks/use-event-modal';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';

export function EventPageActions() {
  const { openModal } = useEventModal();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;

  // Only ADMIN and PLATFORM_ADMIN can create events
  const canCreate =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  if (!canCreate) {
    return null;
  }

  return (
    <Button onClick={() => openModal()}>
      <IconPlus className='h-4 w-4' />
      Create Event
    </Button>
  );
}
