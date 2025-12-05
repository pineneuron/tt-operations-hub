'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconEye, IconPencil, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Row } from '@tanstack/react-table';
import type { MeetingListItem } from '@/features/meetings/types';
import { useMeetingModal } from '@/features/meetings/hooks/use-meeting-modal';
import { UserRole } from '@/types/user-role';
import { useSession } from 'next-auth/react';

interface CellActionProps {
  row: Row<MeetingListItem>;
}

export function MeetingCellAction({ row }: CellActionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;
  const { openModal } = useMeetingModal();
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const data = row.original;
  const isOrganizer = data.organizerId === session?.user?.id;

  const canEdit =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN ||
    isOrganizer;

  const canDelete =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN ||
    isOrganizer;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/meetings/${data.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete meeting');
      }

      toast.success('Meeting deleted successfully');
      setOpenDelete(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <span className='text-muted-foreground'>⋯</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/meetings/${data.id}`)}
          >
            <IconEye className='h-4 w-4' />
            View Details
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onClick={() => openModal(data.id)}>
              <IconPencil className='h-4 w-4' />
              Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setOpenDelete(true)}
                className='text-destructive'
              >
                <IconTrash className='h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{data.title}&quot;? This
              action cannot be undone and will delete all associated data
              including notes and media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
