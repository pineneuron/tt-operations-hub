'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useMeetingModal } from '@/features/meetings/hooks/use-meeting-modal';

interface MeetingEditButtonProps {
  meetingId: string;
}

export function MeetingEditButton({ meetingId }: MeetingEditButtonProps) {
  const { openModal } = useMeetingModal();

  const handleEdit = () => {
    openModal(meetingId);
  };

  return (
    <Button variant='outline' size='sm' onClick={handleEdit}>
      <Pencil className='mr-2 h-4 w-4' />
      Edit
    </Button>
  );
}
