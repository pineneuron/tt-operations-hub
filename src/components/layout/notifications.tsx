'use client';

import * as React from 'react';
import { IconBell, IconCheck, IconX } from '@tabler/icons-react';
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
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

// Mock notifications data - replace with actual data from API
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Task Assigned',
    message: 'You have been assigned a new task in the To Do List',
    time: '2 minutes ago',
    read: false,
    type: 'info'
  },
  {
    id: '2',
    title: 'Event Update',
    message: 'Event "Tech Conference 2024" has been updated',
    time: '1 hour ago',
    read: false,
    type: 'info'
  },
  {
    id: '3',
    title: 'Meeting Reminder',
    message: 'You have a meeting scheduled in 30 minutes',
    time: '3 hours ago',
    read: true,
    type: 'warning'
  },
  {
    id: '4',
    title: 'Transportation Booking',
    message: 'Your transportation booking has been confirmed',
    time: '1 day ago',
    read: true,
    type: 'success'
  }
];

export function Notifications() {
  const [notifications, setNotifications] =
    React.useState<Notification[]>(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
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
        <ScrollArea className='h-[400px]'>
          {notifications.length === 0 ? (
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
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${
                        !notification.read ? 'bg-primary' : 'bg-transparent'
                      }`}
                    />
                    <div className='flex-1 space-y-1'>
                      <p
                        className={`text-sm font-medium ${
                          !notification.read
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className='text-muted-foreground line-clamp-2 text-xs'>
                        {notification.message}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {notification.time}
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
