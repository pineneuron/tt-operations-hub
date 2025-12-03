'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useContext } from 'react';
import { BreadcrumbContext } from '@/contexts/breadcrumb-context';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/employee': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Employee', link: '/dashboard/employee' }
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Product', link: '/dashboard/product' }
  ],
  '/dashboard/events': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Events', link: '/dashboard/events' }
  ]
  // Add more custom mappings as needed
};

export function useBreadcrumbs() {
  const pathname = usePathname();
  const context = useContext(BreadcrumbContext);
  const customTitle = context?.customTitle;

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // Handle dynamic routes with custom titles
    if (pathname.startsWith('/dashboard/events/') && customTitle) {
      return [
        { title: 'Dashboard', link: '/dashboard' },
        { title: 'Events', link: '/dashboard/events' },
        { title: customTitle, link: pathname }
      ];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname, customTitle]);

  return breadcrumbs;
}
