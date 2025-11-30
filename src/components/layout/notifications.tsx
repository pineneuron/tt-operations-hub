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
        const allNotifications = data.notifications || [];
        const unreadNotifications = allNotifications
          .filter((n: Notification) => !n.read)
          .slice(0, 5);

        setNotifications(unreadNotifications);
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

  // Listen for FCM notifications
  React.useEffect(() => {
    const handleFCMNotification = (event: CustomEvent) => {
      const payload = event.detail;
      console.log('FCM notification received:', payload);

      // Refresh notifications when FCM notification is received
      fetchNotifications();
    };

    window.addEventListener(
      'fcm-notification',
      handleFCMNotification as EventListener
    );
    return () => {
      window.removeEventListener(
        'fcm-notification',
        handleFCMNotification as EventListener
      );
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistically update UI - remove from list since we only show unread
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
        <Button variant='ghost' className='relative h-10 w-10 p-0'>
          <IconBell className='size-5 flex-shrink-0' />
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full p-0 text-[10px]'
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
        <ScrollArea className='max-h-[400px]'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <div className='text-muted-foreground text-sm'>Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <IconBell className='text-muted-foreground mb-2 h-12 w-12' />
              <p className='text-muted-foreground text-sm'>
                No unread notifications
              </p>
            </div>
          ) : (
            <div className='py-1'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className='hover:bg-accent bg-accent/50 cursor-pointer px-3 py-2 transition-colors'
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='flex items-start gap-3'>
                    <div className='bg-primary mt-1 h-2 w-2 shrink-0 rounded-full' />
                    <div className='min-w-0 flex-1 space-y-1'>
                      <p className='text-foreground text-sm font-medium'>
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
        {unreadCount > 5 && (
          <>
            <DropdownMenuSeparator />
            <div className='p-2'>
              <Button
                variant='ghost'
                className='w-full'
                size='sm'
                onClick={() => {
                  setOpen(false);
                  router.push('/dashboard/notifications');
                }}
              >
                View all {unreadCount} notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
