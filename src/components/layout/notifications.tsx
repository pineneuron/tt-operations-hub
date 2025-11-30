'use client';

import * as React from 'react';
import { IconBell } from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  entityType?: string | null;
  entityId?: string | null;
  data?: any;
  read: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export function Notifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Get navigation URL based on notification category/entityType
  const getNotificationUrl = (notification: Notification): string | null => {
    const category = notification.entityType || notification.category;

    switch (category) {
      case 'LEAVE':
        return '/dashboard/leaves';
      case 'ATTENDANCE':
        return '/dashboard/attendance/history';
      case 'EVENT':
        return notification.entityId
          ? `/dashboard/events/${notification.entityId}`
          : '/dashboard/events';
      case 'JOB':
        return notification.entityId
          ? `/dashboard/jobs/${notification.entityId}`
          : '/dashboard/jobs';
      case 'MEETING':
        return '/dashboard/meeting';
      case 'TRANSPORTATION':
        return '/dashboard/transportation';
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to the relevant page
    const url = getNotificationUrl(notification);
    if (url) {
      setOpen(false);
      router.push(url);
    }
  };

  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST'
      });
      if (!response.ok) {
        // Revert on error
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST'
      });
      if (!response.ok) {
        // Revert on error
        fetchNotifications();
      } else {
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      fetchNotifications();
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative h-9 w-9'>
          <IconBell className='h-6 w-6' />
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute top-0 right-0 flex h-4 w-4 items-center justify-center p-0 text-[11px]'
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className='sr-only'>Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80'>
        <div className='flex items-center justify-between px-2 py-1.5'>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <div className='text-muted-foreground text-sm'>Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <IconBell className='text-muted-foreground mb-2 h-12 w-12' />
              <p className='text-muted-foreground text-sm'>No notifications</p>
            </div>
          ) : (
            <div className='py-1'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`hover:bg-accent cursor-pointer px-3 py-2 transition-colors ${
                    !notification.read ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        !notification.read ? 'bg-primary' : 'bg-transparent'
                      }`}
                    />
                    <div className='min-w-0 flex-1 space-y-1'>
                      <p
                        className={`text-sm font-medium ${
                          !notification.read
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className='text-muted-foreground line-clamp-2 text-xs'>
                          {notification.message}
                        </p>
                      )}
                      <p className='text-muted-foreground text-xs'>
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className='p-2'>
              <Button variant='ghost' className='w-full' size='sm'>
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
