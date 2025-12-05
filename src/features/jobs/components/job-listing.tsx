import { columns } from '@/features/jobs/components/job-tables/columns';
import type { JobListItem } from '@/features/jobs/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { auth } from '@/lib/auth';
import { JobStatus, type Prisma } from '@prisma/client';
import { UserRole } from '@/types/user-role';
import { JobTable } from './job-tables';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export default async function JobListingPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;

  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const search = searchParamsCache.get('search');
  const statusFilter = searchParamsCache.get('status');
  const eventId = (searchParamsCache as any).get('eventId');
  const assigneeId = (searchParamsCache as any).get('assigneeId');

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const statusValues =
    statusFilter?.split(',').filter(Boolean) ?? ([] as string[]);

  const where: Prisma.JobWhereInput = {};

  // Role-based filtering
  if (userRole === UserRole.STAFF) {
    // Staff only see jobs they're assigned to
    where.assignees = {
      some: {
        userId: session?.user?.id
      }
    };
  }
  // ADMIN and PLATFORM_ADMIN see all jobs

  // Apply filters
  if (statusValues.length) {
    where.status = {
      in: statusValues as JobStatus[]
    };
  }

  if (eventId) {
    where.eventId = eventId;
  }

  if (assigneeId) {
    where.assignees = {
      some: {
        userId: assigneeId
      }
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { remarks: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true
          }
        },
        assignees: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            assignees: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit
    }),
    prisma.job.count({ where })
  ]);

  const tableData: JobListItem[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    remarks: job.remarks,
    status: job.status,
    priority: job.priority,
    dueDate: job.dueDate?.toISOString() || null,
    completedAt: job.completedAt?.toISOString() || null,
    eventId: job.eventId,
    eventTitle: job.event?.title || null,
    assigneeCount: job._count.assignees,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  }));

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-4'>
      <JobTable data={tableData} totalItems={total} />
    </div>
  );
}
