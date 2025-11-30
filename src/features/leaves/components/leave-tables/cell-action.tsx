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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { LeaveListItem } from '@/features/leaves/types';
import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconEye,
  IconRotateClockwise
} from '@tabler/icons-react';
import { useState } from 'react';
import { useLeaveModal } from '@/features/leaves/hooks/use-leave-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface CellActionProps {
  data: LeaveListItem;
}

const rejectFormSchema = z.object({
  rejectionReason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters.')
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;

export function LeaveCellAction({ data }: CellActionProps) {
  const [openDelete, setOpenDelete] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [loading, setLoading] = useState(false);
  const openEdit = useLeaveModal((state) => state.openEdit);
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;

  const rejectForm = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: {
      rejectionReason: ''
    }
  });

  // Only allow edit if status is PENDING and user is the owner
  const canEdit =
    data.status === 'PENDING' && data.userId === session?.user?.id;
  // Owner can delete their own pending leave, admins can cancel any pending leave
  const canDelete =
    data.status === 'PENDING' &&
    (data.userId === session?.user?.id ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.PLATFORM_ADMIN);
  // Only ADMIN and PLATFORM_ADMIN can approve/reject/unapprove
  const canApprove =
    (userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN) &&
    data.status === 'PENDING';
  const canReject = canApprove;
  const canUnapprove =
    (userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN) &&
    data.status === 'APPROVED';
  const canView = true; // Anyone can view leave details

  const onDelete = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaves/${data.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to delete leave request.');
      }

      toast.success('Leave request has been cancelled.');
      setOpenDelete(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete leave request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaves/${data.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to approve leave request.');
      }

      toast.success('Leave request has been approved.');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to approve leave request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onReject = async (values: RejectFormValues) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaves/${data.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: values.rejectionReason.trim()
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to reject leave request.');
      }

      toast.success('Leave request has been rejected.');
      setOpenReject(false);
      rejectForm.reset();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to reject leave request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmit = rejectForm.handleSubmit(onReject);

  const onUnapprove = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaves/${data.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unapprove' })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? 'Failed to unapprove leave request.'
        );
      }

      toast.success('Leave request has been unapproved.');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to unapprove leave request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={onDelete}
        loading={loading}
      />

      {/* Reject Dialog */}
      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request. This
              reason will be sent to the employee.
            </DialogDescription>
          </DialogHeader>
          <Form form={rejectForm} onSubmit={handleRejectSubmit}>
            <div className='space-y-4'>
              <FormField
                control={rejectForm.control}
                name='rejectionReason'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Please provide a clear reason for rejection...'
                        rows={4}
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setOpenReject(false);
                    rejectForm.reset();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type='submit' variant='destructive' disabled={loading}>
                  {loading ? 'Rejecting...' : 'Reject Leave'}
                </Button>
              </DialogFooter>
            </div>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              View complete details of this leave request.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Employee
                </p>
                <p className='text-sm'>{data.userName}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Leave Type
                </p>
                <p className='text-sm'>{data.leaveType}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Status
                </p>
                <p className='text-sm'>{data.status}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Total Days
                </p>
                <p className='text-sm'>{data.totalDays}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Start Date
                </p>
                <p className='text-sm'>
                  {new Date(data.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  End Date
                </p>
                <p className='text-sm'>
                  {new Date(data.endDate).toLocaleDateString()}
                </p>
              </div>
              {data.isHalfDay && (
                <div>
                  <p className='text-muted-foreground text-sm font-medium'>
                    Half Day Type
                  </p>
                  <p className='text-sm'>{data.halfDayType}</p>
                </div>
              )}
              {data.approvedById && (
                <>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Approved By
                    </p>
                    <p className='text-sm'>{data.approvedByName}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Approved At
                    </p>
                    <p className='text-sm'>
                      {data.approvedAt
                        ? new Date(data.approvedAt).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                </>
              )}
              {data.rejectionReason && (
                <div className='col-span-2'>
                  <p className='text-muted-foreground text-sm font-medium'>
                    Rejection Reason
                  </p>
                  <p className='text-sm'>{data.rejectionReason}</p>
                </div>
              )}
            </div>
            <div>
              <p className='text-muted-foreground text-sm font-medium'>
                Reason
              </p>
              <p className='text-sm whitespace-pre-wrap'>{data.reason}</p>
            </div>
            {data.notes && (
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Notes
                </p>
                <p className='text-sm whitespace-pre-wrap'>{data.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenView(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <IconDotsVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {canView && (
            <DropdownMenuItem onClick={() => setOpenView(true)}>
              <IconEye className='h-4 w-4' />
              View Details
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem onClick={() => openEdit(data)}>
              <IconEdit className='h-4 w-4' />
              Edit
            </DropdownMenuItem>
          )}
          {canApprove && (
            <DropdownMenuItem onClick={onApprove}>
              <IconCheck className='h-4 w-4' />
              Approve
            </DropdownMenuItem>
          )}
          {canReject && (
            <DropdownMenuItem onClick={() => setOpenReject(true)}>
              <IconX className='h-4 w-4' />
              Reject
            </DropdownMenuItem>
          )}
          {canUnapprove && (
            <DropdownMenuItem onClick={onUnapprove}>
              <IconRotateClockwise className='h-4 w-4' />
              Unapprove
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenDelete(true)}>
                <IconTrash className='h-4 w-4' />
                Cancel
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
