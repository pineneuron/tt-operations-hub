import { columns } from '@/features/meetings/components/meeting-tables/columns';
import type { MeetingListItem } from '@/features/meetings/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { auth } from '@/lib/auth';
import { MeetingStatus, MeetingType, type Prisma } from '@prisma/client';
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
import { MeetingListingWrapper } from './meeting-listing-wrapper';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export default async function MeetingListingPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;

  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const search = searchParamsCache.get('search');
  const statusFilter = searchParamsCache.get('status');
  const typeFilter = searchParamsCache.get('type');
  const datePreset = searchParamsCache.get('datePreset');
  const dateFrom = searchParamsCache.get('dateFrom');
  const dateTo = searchParamsCache.get('dateTo');
  const filterType = searchParamsCache.get('filterType'); // upcoming | past | today

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const statusValues =
    statusFilter?.split(',').filter(Boolean) ?? ([] as string[]);
  const typeValues = typeFilter?.split(',').filter(Boolean) ?? ([] as string[]);

  const where: Prisma.MeetingWhereInput = {};

  // Role-based filtering
  if (userRole === UserRole.CLIENT) {
    where.participants = {
      some: {
        userId: session?.user?.id
      }
    };
  } else if (
    userRole === UserRole.STAFF ||
    userRole === UserRole.VENDOR_SUPPLIER
  ) {
    where.participants = {
      some: {
        userId: session?.user?.id
      }
    };
  }
  // ADMIN and PLATFORM_ADMIN see all meetings

  // Apply filters
  if (statusValues.length) {
    where.status = {
      in: statusValues as MeetingStatus[]
    };
  }

  if (typeValues.length) {
    where.type = {
      in: typeValues as MeetingType[]
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { agenda: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Upcoming / Past / Today filter
  if (filterType === 'upcoming') {
    const now = new Date();
    where.startTime = {
      gte: now
    };
  } else if (filterType === 'past') {
    const now = new Date();
    where.startTime = {
      lt: now
    };
  } else if (filterType === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    where.startTime = {
      gte: today,
      lt: tomorrow
    };
  }

  // Date range filtering
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
      where.startTime = {
        gte: startDateFilter,
        lte: endDateFilter
      };
    }
  }

  // For calendar view, we need to fetch meetings for the current month
  // Get current month or from query param if available
  const calendarMonth = new Date();
  const calendarMonthStart = startOfMonth(calendarMonth);
  const calendarMonthEnd = endOfMonth(calendarMonth);

  // Calendar where clause - same filters but for current month
  const calendarWhere: Prisma.MeetingWhereInput = {
    ...where,
    OR: [
      {
        startTime: {
          gte: calendarMonthStart,
          lte: calendarMonthEnd
        }
      },
      {
        endTime: {
          gte: calendarMonthStart,
          lte: calendarMonthEnd
        }
      },
      {
        AND: [
          { startTime: { lte: calendarMonthStart } },
          { endTime: { gte: calendarMonthEnd } }
        ]
      }
    ]
  };

  const [meetings, totalMeetings, calendarMeetings] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        organizer: {
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
        startTime: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.meeting.count({ where }),
    // Fetch meetings for calendar view
    prisma.meeting.findMany({
      where: calendarWhere,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true
      },
      orderBy: {
        startTime: 'asc'
      }
    })
  ]);

  const tableData: MeetingListItem[] = meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    agenda: meeting.agenda,
    startTime: meeting.startTime.toISOString(),
    endTime: meeting.endTime.toISOString(),
    location: meeting.location,
    meetingLink: meeting.meetingLink,
    status: meeting.status,
    type: meeting.type,
    organizerId: meeting.organizerId,
    organizerName: meeting.organizer.name,
    organizerEmail: meeting.organizer.email,
    participantCount: meeting._count.participants,
    isRecurring: meeting.isRecurring,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString()
  }));

  const calendarData = calendarMeetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    startTime: meeting.startTime.toISOString(),
    endTime: meeting.endTime.toISOString(),
    status: meeting.status,
    type: meeting.type
  }));

  return (
    <MeetingListingWrapper
      tableData={tableData}
      totalItems={totalMeetings}
      userRole={userRole}
      calendarMeetings={calendarData}
    />
  );
}
