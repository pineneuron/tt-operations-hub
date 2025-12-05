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
import type { TransportationBookingListItem } from '@/features/transportation/types';
import { useTransportationBookingModal } from '@/features/transportation/hooks/use-transportation-booking-modal';
import { UserRole } from '@/types/user-role';
import { useSession } from 'next-auth/react';

interface BookingCellActionProps {
  booking: TransportationBookingListItem;
}

export function TransportationBookingCellAction({
  booking
}: BookingCellActionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;
  const { openModal } = useTransportationBookingModal();
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCreator = booking.createdById === session?.user?.id;

  const canEdit =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN ||
    isCreator;

  const canDelete =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN ||
    isCreator;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/transportation/bookings/${booking.id}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete booking');
      }

      toast.success('Booking deleted successfully');
      setOpenDelete(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete booking');
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
            <IconPencil className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              router.push(`/dashboard/transportation/bookings/${booking.id}`)
            }
          >
            <IconEye className='mr-2 h-4 w-4' />
            View Details
          </DropdownMenuItem>
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal(booking.id)}>
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

      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              booking. If an entry is linked, it will be unlinked but not
              deleted.
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
