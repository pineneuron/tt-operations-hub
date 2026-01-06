import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import { UserNav } from './user-nav';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import { Notifications } from './notifications';
import { HeaderAttendanceWidget } from './header-attendance-widget';
import { getCurrentUser } from '@/lib/auth-helpers';
import { UserRole } from '@/types/user-role';

export default async function Header() {
  const user = await getCurrentUser();
  const userRole = user?.role as UserRole;
  const showAttendance =
    userRole === UserRole.STAFF || userRole === UserRole.FINANCE;

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 pr-4 pl-0 md:gap-4 md:pl-4'>
        <div className='flex'>
          {showAttendance ? <HeaderAttendanceWidget /> : <SearchInput />}
        </div>
        <Notifications />
        <div className='hidden md:flex'>
          <ModeToggle />
        </div>
        <UserNav />
      </div>
    </header>
  );
}
