'use client';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useMeetingModal } from '@/features/meetings/hooks/use-meeting-modal';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';

export function MeetingPageActions() {
  const { openModal } = useMeetingModal();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;

  // ADMIN, PLATFORM_ADMIN, and STAFF can create meetings
  const canCreate =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN ||
    userRole === UserRole.STAFF;

  if (!canCreate) {
    return null;
  }

  return (
    <Button onClick={() => openModal()}>
      <IconPlus className='h-4 w-4' />
      Create Meeting
    </Button>
  );
}
