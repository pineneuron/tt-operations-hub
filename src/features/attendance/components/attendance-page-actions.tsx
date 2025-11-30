'use client';

import { Button } from '@/components/ui/button';
import { IconDownload } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/user-role';
import { toast } from 'sonner';

export function AttendancePageActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;

  // Only ADMIN and PLATFORM_ADMIN can export
  const canExport =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  if (!canExport) {
    return null;
  }

  const handleExport = async () => {
    try {
      // Build query string from current search params
      // Exclude pagination params (page, perPage) since we want all results
      const params = new URLSearchParams();
      searchParams.forEach((value, key) => {
        // Skip pagination params
        if (key !== 'page' && key !== 'perPage') {
          params.append(key, value);
        }
      });

      const response = await fetch(
        `/api/attendance/history/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to export attendance data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Attendance data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance data');
    }
  };

  return (
    <Button onClick={handleExport} variant='outline' size='sm'>
      <IconDownload className='mr-2 h-4 w-4' />
      Export
    </Button>
  );
}
