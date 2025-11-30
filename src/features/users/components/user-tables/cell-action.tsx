'use client';

import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserListItem } from '@/features/users/types';
import { IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useUserModal } from '@/features/users/hooks/use-user-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CellActionProps {
  data: UserListItem;
}

export function UserCellAction({ data }: CellActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const openEdit = useUserModal((state) => state.openEdit);
  const router = useRouter();

  const onConfirm = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${data.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to delete user.');
      }

      toast.success('User has been deleted.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete user.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <IconDotsVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => openEdit(data)}>
            <IconEdit className='mr-2 h-4 w-4' />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <IconTrash className='mr-2 h-4 w-4' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
