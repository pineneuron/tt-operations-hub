import { NavItem } from '@/types';
import { UserRole } from '@/types/user-role';

export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

// Helper function to check if a menu item should be visible for a role
export function isMenuItemVisible(item: NavItem, userRole?: string): boolean {
  if (!item.roles || item.roles.length === 0) {
    return true; // If no roles specified, show to everyone
  }
  if (!userRole) {
    return false;
  }
  return item.roles.includes(userRole as UserRole);
}

//Info: The following data is used for the sidebar navigation and Cmd K bar.
export const navItems: NavItem[] = [
  {
    title: 'Home',
    url: '/dashboard',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['h', 'h'],
    items: [],
    roles: [] // Available to all roles
  },
  {
    title: 'Attendance',
    url: '/dashboard/attendance',
    icon: 'attendance',
    isActive: false,
    shortcut: ['a', 'a'],
    roles: [UserRole.STAFF, UserRole.PLATFORM_ADMIN, UserRole.ADMIN],
    items: [
      {
        title: 'Attendance History',
        url: '/dashboard/attendance/history',
        icon: 'history',
        roles: [
          UserRole.STAFF,
          UserRole.FINANCE,
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN
        ]
      }
    ]
  },
  {
    title: 'Leaves',
    url: '/dashboard/leaves',
    icon: 'leaves',
    isActive: false,
    shortcut: ['l', 'l'],
    items: [
      {
        title: 'Leave Requests',
        url: '/dashboard/leaves',
        icon: 'leaves',
        roles: [
          UserRole.STAFF,
          UserRole.FINANCE,
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN
        ]
      },
      {
        title: 'Public Holidays',
        url: '/dashboard/leaves/public-holidays',
        icon: 'holidays',
        roles: [UserRole.ADMIN, UserRole.PLATFORM_ADMIN]
      }
    ],
    roles: [
      UserRole.STAFF,
      UserRole.FINANCE,
      UserRole.ADMIN,
      UserRole.PLATFORM_ADMIN
    ]
  },
  {
    title: 'Events',
    url: '/dashboard/events',
    icon: 'events',
    isActive: false,
    shortcut: ['e', 'e'],
    roles: [], // Available to all roles
    items: [
      {
        title: 'All Events',
        url: '/dashboard/events',
        icon: 'events',
        roles: []
      },
      {
        title: 'Upcoming Events',
        url: '/dashboard/events?type=upcoming',
        icon: 'upcoming',
        roles: []
      },
      {
        title: 'Past Events',
        url: '/dashboard/events?type=past',
        icon: 'past',
        roles: []
      }
    ]
  },
  {
    title: 'Meetings',
    url: '/dashboard/meeting',
    icon: 'meeting',
    isActive: false,
    shortcut: ['m', 'm'],
    roles: [], // Available to all roles
    items: [
      {
        title: 'All Meetings',
        url: '/dashboard/meetings',
        icon: 'meeting',
        roles: []
      },
      {
        title: 'Upcoming Meetings',
        url: '/dashboard/meetings/upcoming',
        icon: 'upcoming',
        roles: []
      },
      {
        title: 'Past Meetings',
        url: '/dashboard/meetings/past',
        icon: 'past',
        roles: []
      }
    ]
  },
  {
    title: 'Jobs',
    url: '/dashboard/jobs',
    icon: 'todo',
    isActive: false,
    shortcut: ['t', 't'],
    roles: [
      UserRole.STAFF,
      UserRole.VENDOR_SUPPLIER,
      UserRole.PLATFORM_ADMIN,
      UserRole.ADMIN
    ],
    items: [
      {
        title: 'All Jobs',
        url: '/dashboard/jobs',
        icon: 'todo',
        roles: [
          UserRole.STAFF,
          UserRole.VENDOR_SUPPLIER,
          UserRole.PLATFORM_ADMIN,
          UserRole.ADMIN
        ]
      },
      {
        title: 'Add New',
        url: '/dashboard/jobs/add',
        icon: 'add',
        roles: [
          UserRole.STAFF,
          UserRole.VENDOR_SUPPLIER,
          UserRole.PLATFORM_ADMIN,
          UserRole.ADMIN
        ]
      }
    ]
  },
  {
    title: 'Transportation',
    url: '/dashboard/transportation',
    icon: 'transportation',
    isActive: false,
    shortcut: ['tr', 'tr'],
    roles: [
      UserRole.STAFF,
      UserRole.VENDOR_SUPPLIER,
      UserRole.PLATFORM_ADMIN,
      UserRole.ADMIN
    ],
    items: [
      {
        title: 'Transportation Booking',
        url: '/dashboard/transportation',
        icon: 'booking',
        roles: [UserRole.STAFF, UserRole.PLATFORM_ADMIN, UserRole.ADMIN]
      },
      {
        title: 'Transportation Entry',
        url: '/dashboard/transportation?tab=entries',
        icon: 'entry',
        roles: [
          UserRole.STAFF,
          UserRole.VENDOR_SUPPLIER,
          UserRole.PLATFORM_ADMIN,
          UserRole.ADMIN
        ]
      }
    ]
  },
  {
    title: 'Users',
    url: '/dashboard/users',
    icon: 'user',
    isActive: false,
    shortcut: ['u', 'u'],
    items: [
      {
        title: 'Add New',
        url: '/dashboard/users',
        icon: 'add',
        roles: [UserRole.PLATFORM_ADMIN, UserRole.ADMIN]
      },
      {
        title: 'All Users',
        url: '/dashboard/users',
        icon: 'user',
        roles: [UserRole.PLATFORM_ADMIN, UserRole.ADMIN]
      }
    ],
    roles: [UserRole.PLATFORM_ADMIN, UserRole.ADMIN]
  }
];

export interface SaleUser {
  id: number;
  name: string;
  email: string;
  amount: string;
  image: string;
  initials: string;
}

export const recentSalesData: SaleUser[] = [
  {
    id: 1,
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    amount: '+$1,999.00',
    image: 'https://api.slingacademy.com/public/sample-users/1.png',
    initials: 'OM'
  },
  {
    id: 2,
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    amount: '+$39.00',
    image: 'https://api.slingacademy.com/public/sample-users/2.png',
    initials: 'JL'
  },
  {
    id: 3,
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    amount: '+$299.00',
    image: 'https://api.slingacademy.com/public/sample-users/3.png',
    initials: 'IN'
  },
  {
    id: 4,
    name: 'William Kim',
    email: 'will@email.com',
    amount: '+$99.00',
    image: 'https://api.slingacademy.com/public/sample-users/4.png',
    initials: 'WK'
  },
  {
    id: 5,
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    amount: '+$39.00',
    image: 'https://api.slingacademy.com/public/sample-users/5.png',
    initials: 'SD'
  }
];
