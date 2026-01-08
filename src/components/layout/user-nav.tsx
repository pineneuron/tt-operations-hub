'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { IconBrightness, IconSettings, IconUser } from '@tabler/icons-react';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function UserNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const handleThemeToggle = React.useCallback(() => {
    const newMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;

    if (!document.startViewTransition) {
      setTheme(newMode);
      return;
    }

    document.startViewTransition(() => {
      setTheme(newMode);
    });
  }, [resolvedTheme, setTheme]);

  // Show skeleton while loading
  if (status === 'loading') {
    return <Skeleton className='h-8 w-8 rounded-full' />;
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <UserAvatarProfile user={user as any} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56'
        align='end'
        sideOffset={10}
        forceMount
      >
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>
              {user.name || 'User'}
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
            <IconUser className='h-4 w-4' />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconSettings className='h-4 w-4' />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className='inline-flex md:hidden'
            onClick={handleThemeToggle}
          >
            <IconBrightness className='h-4 w-4' />
            <span>Toggle Theme</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
