'use client';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useJobModal } from '@/features/jobs/hooks/use-job-modal';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';

export function JobPageActions() {
  const { openModal } = useJobModal();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;

  // Only ADMIN and PLATFORM_ADMIN can create jobs
  const canCreate =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  if (!canCreate) {
    return null;
  }

  return (
    <div className='mb-4 flex-shrink-0'>
      <Button onClick={() => openModal()}>
        <IconPlus className='h-4 w-4' />
        Create Job
      </Button>
    </div>
  );
}
