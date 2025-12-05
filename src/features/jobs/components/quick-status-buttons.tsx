'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { JobStatus } from '@prisma/client';
import { UserRole } from '@/types/user-role';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface QuickStatusButtonsProps {
  jobId: string;
  currentStatus: JobStatus;
}

const statusOptions: Array<{
  status: JobStatus;
  label: string;
  allowedRoles: UserRole[];
  className: string;
}> = [
  {
    status: JobStatus.IN_PROGRESS,
    label: 'In Progress',
    allowedRoles: [UserRole.STAFF, UserRole.ADMIN, UserRole.PLATFORM_ADMIN],
    className: 'bg-blue-500 hover:bg-blue-600 text-white'
  },
  {
    status: JobStatus.IN_REVIEW,
    label: 'In Review',
    allowedRoles: [UserRole.STAFF, UserRole.ADMIN, UserRole.PLATFORM_ADMIN],
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white'
  },
  {
    status: JobStatus.COMPLETED,
    label: 'Completed',
    allowedRoles: [UserRole.ADMIN, UserRole.PLATFORM_ADMIN],
    className: 'bg-emerald-500 hover:bg-emerald-600 text-white'
  },
  {
    status: JobStatus.BLOCKED,
    label: 'Blocked',
    allowedRoles: [UserRole.ADMIN, UserRole.PLATFORM_ADMIN],
    className: 'bg-red-500 hover:bg-red-600 text-white'
  }
];

export function QuickStatusButtons({
  jobId,
  currentStatus
}: QuickStatusButtonsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState<JobStatus | null>(null);

  const userRole = session?.user?.role as UserRole | undefined;

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (newStatus === currentStatus) return;

    try {
      setLoading(newStatus);
      const res = await fetch(`/api/jobs/${jobId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'STATUS',
          status: newStatus,
          message: `Status changed to ${statusOptions.find((s) => s.status === newStatus)?.label || newStatus}`
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to update status');
      }

      toast.success('Status updated successfully');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  if (!userRole) return null;

  const availableStatuses = statusOptions.filter((option) =>
    option.allowedRoles.includes(userRole)
  );

  if (availableStatuses.length === 0) return null;

  return (
    <div className='space-y-2 border-t pt-4'>
      <h4 className='text-muted-foreground text-xs font-semibold uppercase'>
        Quick Actions
      </h4>
      <div className='flex flex-wrap gap-2'>
        {availableStatuses.map((option) => {
          const isActive = currentStatus === option.status;
          const isLoading = loading === option.status;
          return (
            <Button
              key={option.status}
              size='sm'
              variant={isActive ? 'outline' : 'default'}
              onClick={() => handleStatusChange(option.status)}
              disabled={isActive || isLoading}
              className={cn(
                !isActive && option.className,
                isActive && 'cursor-default'
              )}
            >
              {isLoading ? 'Updating...' : option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
