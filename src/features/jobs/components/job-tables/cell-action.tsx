'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconEye,
  IconPencil,
  IconTrash,
  IconMessage
} from '@tabler/icons-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { JobListItem } from '@/features/jobs/types';
import { useJobModal } from '@/features/jobs/hooks/use-job-modal';
import { useJobUpdateModal } from '@/features/jobs/hooks/use-job-update-modal';
import { UserRole } from '@/types/user-role';
import { useSession } from 'next-auth/react';

interface CellActionProps {
  data: JobListItem;
}

export function JobCellAction({ data }: CellActionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;
  const { openModal } = useJobModal();
  const { openModal: openUpdateModal } = useJobUpdateModal();
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;
  const canDelete =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;
  const canView = true; // All assigned users can view

  const handleEdit = () => {
    openModal(data);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${data.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete job');
      }

      toast.success('Job deleted successfully');
      setOpenDelete(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete job');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = () => {
    openUpdateModal(data.id);
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
            onClick={() => router.push(`/dashboard/jobs/${data.id}`)}
          >
            <IconEye className='mr-2 h-4 w-4' />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddUpdate}>
            <IconMessage className='mr-2 h-4 w-4' />
            Add Update
          </DropdownMenuItem>
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleEdit}>
                <IconPencil className='mr-2 h-4 w-4' />
                Edit
              </DropdownMenuItem>
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setOpenDelete(true)}
                className='text-destructive'
              >
                <IconTrash className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.title}&quot;? This
              action cannot be undone and will delete all associated data
              including updates, assignments, and media.
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => setOpenDelete(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
