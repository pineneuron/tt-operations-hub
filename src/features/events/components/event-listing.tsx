import { columns } from '@/features/events/components/event-tables/columns';
import type { EventListItem } from '@/features/events/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { auth } from '@/lib/auth';
import { EventStatus, type Prisma } from '@prisma/client';
import { UserRole } from '@/types/user-role';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths
} from 'date-fns';
import { EventListingWrapper } from './event-listing-wrapper';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export default async function EventListingPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;

  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const search = searchParamsCache.get('search');
  const statusFilter = searchParamsCache.get('status');
  const clientId = searchParamsCache.get('clientId');
  const datePreset = searchParamsCache.get('datePreset');
  const dateFrom = searchParamsCache.get('dateFrom');
  const dateTo = searchParamsCache.get('dateTo');
  const typeFilter = searchParamsCache.get('type'); // upcoming | past

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const statusValues =
    statusFilter?.split(',').filter(Boolean) ?? ([] as string[]);

  const where: Prisma.EventWhereInput = {};

  // Role-based filtering
  if (userRole === UserRole.CLIENT) {
    // Clients only see their own events
    where.clientId = session?.user?.id;
  } else if (userRole === UserRole.STAFF) {
    // Staff only see events they're assigned to as STAFF
    where.participants = {
      some: {
        userId: session?.user?.id,
        role: 'STAFF'
      }
    };
  } else if (userRole === UserRole.VENDOR_SUPPLIER) {
    // Vendors/Suppliers see events they're assigned to
    where.participants = {
      some: {
        userId: session?.user?.id,
        role: { in: ['VENDOR', 'SUPPLIER'] }
      }
    };
  }
  // ADMIN and PLATFORM_ADMIN see all events

  // Apply filters
  if (statusValues.length) {
    where.status = {
      in: statusValues as EventStatus[]
    };
  }

  if (clientId) {
    where.clientId = clientId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { venue: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Upcoming / Past filter (based on endDate)
  if (typeFilter === 'upcoming') {
    const now = new Date();
    where.endDate = {
      gte: now
    };
  } else if (typeFilter === 'past') {
    const now = new Date();
    where.endDate = {
      lt: now
    };
  }

  // Date range filtering - only for ADMIN and PLATFORM_ADMIN
  const canUseDateFilter =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  if (canUseDateFilter && (datePreset || dateFrom || dateTo)) {
    let startDateFilter: Date | undefined;
    let endDateFilter: Date | undefined;

    if (datePreset === 'today') {
      const today = new Date();
      startDateFilter = startOfDay(today);
      endDateFilter = endOfDay(today);
    } else if (datePreset === 'this-week') {
      const today = new Date();
      startDateFilter = startOfWeek(today, { weekStartsOn: 0 });
      endDateFilter = endOfWeek(today, { weekStartsOn: 0 });
    } else if (datePreset === 'this-month') {
      const today = new Date();
      startDateFilter = startOfMonth(today);
      endDateFilter = endOfMonth(today);
    } else if (datePreset === 'last-month') {
      const lastMonth = subMonths(new Date(), 1);
      startDateFilter = startOfMonth(lastMonth);
      endDateFilter = endOfMonth(lastMonth);
    } else if (datePreset === 'this-year') {
      const today = new Date();
      startDateFilter = startOfYear(today);
      endDateFilter = endOfYear(today);
    } else if (datePreset && /^\d{4}-\d{2}$/.test(datePreset)) {
      // Handle month presets like "2024-01"
      const [year, month] = datePreset.split('-').map(Number);
      const monthDate = new Date(year, month - 1, 1);
      startDateFilter = startOfMonth(monthDate);
      endDateFilter = endOfMonth(monthDate);
    }

    if (dateFrom) {
      startDateFilter = new Date(dateFrom);
      startDateFilter.setHours(0, 0, 0, 0);
    }

    if (dateTo) {
      endDateFilter = new Date(dateTo);
      endDateFilter.setHours(23, 59, 59, 999);
    }

    if (startDateFilter || endDateFilter) {
      where.OR = [
        {
          startDate: {
            gte: startDateFilter,
            lte: endDateFilter
          }
        },
        {
          endDate: {
            gte: startDateFilter,
            lte: endDateFilter
          }
        },
        {
          AND: [
            { startDate: { lte: startDateFilter } },
            { endDate: { gte: endDateFilter } }
          ]
        }
      ];
    }
  }

  // For calendar view, we need to fetch events for the current month
  // Get current month or from query param if available
  const calendarMonth = new Date();
  const calendarMonthStart = startOfMonth(calendarMonth);
  const calendarMonthEnd = endOfMonth(calendarMonth);

  // Calendar where clause - same filters but for current month
  const calendarWhere: Prisma.EventWhereInput = {
    ...where,
    OR: [
      {
        startDate: {
          gte: calendarMonthStart,
          lte: calendarMonthEnd
        }
      },
      {
        endDate: {
          gte: calendarMonthStart,
          lte: calendarMonthEnd
        }
      },
      {
        AND: [
          { startDate: { lte: calendarMonthStart } },
          { endDate: { gte: calendarMonthEnd } }
        ]
      }
    ]
  };

  const [events, totalEvents, calendarEvents] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.event.count({ where }),
    // Fetch all events for calendar view (current month)
    prisma.event.findMany({
      where: calendarWhere,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        status: true,
        featuredImageUrl: true
      },
      orderBy: {
        startDate: 'asc'
      }
    })
  ]);

  const tableData: EventListItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    featuredImageUrl: event.featuredImageUrl,
    clientId: event.clientId,
    clientName: event.client.name,
    clientEmail: event.client.email,
    venue: event.venue,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    status: event.status,
    participantCount: event._count.participants,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  }));

  const calendarData = calendarEvents.map((event) => ({
    id: event.id,
    title: event.title,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    status: event.status,
    featuredImageUrl: event.featuredImageUrl
  }));

  return (
    <EventListingWrapper
      tableData={tableData}
      totalItems={totalEvents}
      userRole={userRole}
      calendarEvents={calendarData}
    />
  );
}
