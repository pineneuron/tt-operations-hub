import { HolidayTable } from '@/features/holidays/components/holiday-tables';
import { columns } from '@/features/holidays/components/holiday-tables/columns';
import type { HolidayListItem } from '@/features/holidays/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import type { Prisma } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export default async function HolidayListingPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;

  // Only ADMIN and PLATFORM_ADMIN can access
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-muted-foreground'>
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const categoryFilter = searchParamsCache.get('category');
  const yearFilter = searchParamsCache.get('year');
  const recurringFilter = searchParamsCache.get('isRecurring');

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const where: Prisma.NepaliHolidayWhereInput = {};

  // Filter by current year by default
  const currentYear = new Date().getFullYear();
  where.year = yearFilter ? parseInt(yearFilter) : currentYear;

  if (categoryFilter) {
    where.category = {
      contains: categoryFilter,
      mode: 'insensitive'
    };
  }

  if (recurringFilter) {
    const isRecurring = recurringFilter === 'true';
    where.isRecurring = isRecurring;
  }

  const [holidays, totalHolidays] = await Promise.all([
    prisma.nepaliHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
      skip,
      take: limit
    }),
    prisma.nepaliHoliday.count({ where })
  ]);

  const tableData: HolidayListItem[] = holidays.map((holiday) => ({
    id: holiday.id,
    category: holiday.category,
    nameNepali: holiday.nameNepali,
    date: holiday.date.toISOString(),
    year: holiday.year,
    isRecurring: holiday.isRecurring,
    description: holiday.description,
    createdAt: holiday.createdAt.toISOString(),
    updatedAt: holiday.updatedAt.toISOString()
  }));

  return (
    <HolidayTable
      data={tableData}
      totalItems={totalHolidays}
      columns={columns}
    />
  );
}
