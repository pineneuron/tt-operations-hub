'use client';

import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { HolidayListItem } from '@/features/holidays/types';
import { IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useHolidayModal } from '@/features/holidays/hooks/use-holiday-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';

interface CellActionProps {
  data: HolidayListItem;
}

export function HolidayCellAction({ data }: CellActionProps) {
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const openEdit = useHolidayModal((state) => state.openEdit);
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;

  // Only ADMIN and PLATFORM_ADMIN can edit/delete holidays
  const canEdit =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;
  const canDelete = canEdit;

  const onDelete = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/holidays/${data.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to delete holiday.');
      }

      toast.success('Holiday has been deleted.');
      setOpenDelete(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete holiday.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit && !canDelete) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <IconDotsVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canEdit && (
            <DropdownMenuItem onClick={() => openEdit(data.id)}>
              <IconEdit className='mr-2 h-4 w-4' />
              Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setOpenDelete(true)}
              className='text-destructive focus:text-destructive'
            >
              <IconTrash className='mr-2 h-4 w-4' />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertModal
        isOpen={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={onDelete}
        loading={loading}
      />
    </>
  );
}
