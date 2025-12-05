'use client';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useJobUpdateModal } from '@/features/jobs/hooks/use-job-update-modal';

interface AddUpdateButtonProps {
  jobId: string;
}

export function AddUpdateButton({ jobId }: AddUpdateButtonProps) {
  const { openModal } = useJobUpdateModal();

  return (
    <Button onClick={() => openModal(jobId)}>
      <IconPlus className='mr-2 h-4 w-4' />
      Add Update
    </Button>
  );
}
