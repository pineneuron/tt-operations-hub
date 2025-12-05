import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatTimeAgo } from '@/lib/utils';
import { JobStatus } from '@prisma/client';
import { UserRole } from '@/types/user-role';
import { JobBreadcrumbSetter } from '@/components/job-breadcrumb-setter';
import { JobUpdateModal } from '@/features/jobs/components/job-update-modal';
import { JobMediaItem } from '@/components/job-media-item';
import { JOB_PRIORITY_OPTIONS } from '@/features/jobs/components/job-tables/options';
import { InlineCommentForm } from '@/features/jobs/components/inline-comment-form';
import { CommentItem } from '@/features/jobs/components/comment-item';
import { JobDetailTabs } from '@/features/jobs/components/job-detail-tabs';

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

const statusLabelMap = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed'
} as Record<string, string>;

const getUpdateTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'STATUS':
      return 'bg-blue-500 hover:bg-blue-600 text-white border-transparent';
    case 'MILESTONE':
      return 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent';
    case 'ISSUE':
      return 'bg-red-500 hover:bg-red-600 text-white border-transparent';
    case 'NOTE':
      return 'bg-purple-500 hover:bg-purple-600 text-white border-transparent';
    default:
      return '';
  }
};

const getJobStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-gray-500 hover:bg-gray-600 text-white border-transparent';
    case 'IN_PROGRESS':
      return 'bg-blue-500 hover:bg-blue-600 text-white border-transparent';
    case 'IN_REVIEW':
      return 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent';
    case 'BLOCKED':
      return 'bg-red-500 hover:bg-red-600 text-white border-transparent';
    case 'COMPLETED':
      return 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent';
    default:
      return '';
  }
};

const formatDate = (value: Date | string | null) =>
  value ? format(new Date(value), 'MMM dd, yyyy') : '-';

const formatDateTime = (value: Date | string | null) =>
  value ? format(new Date(value), 'MMM dd, yyyy hh:mm a') : '-';

const formatTimelineDate = (value: Date | string) => {
  const date = new Date(value);
  const dayName = format(date, 'EEE');
  const month = format(date, 'MMM');
  const day = date.getDate();
  const year = format(date, 'yyyy');
  const time = format(date, 'h:mm a');

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return `${dayName}, ${month} ${day}${getOrdinal(day)} ${year}, ${time}`;
};

export const metadata = {
  title: 'Dashboard: Job Details'
};

export default async function JobDetailPage(props: PageProps) {
  const session = await auth();
  const { jobId } = await props.params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      event: {
        select: {
          id: true,
          title: true
        }
      },
      assignees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      updates: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          media: {
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      _count: {
        select: {
          assignees: true
        }
      }
    } as any
  });

  if (!job) {
    notFound();
  }

  // Check access: Staff can only see jobs they're assigned to
  const userRole = session?.user?.role as UserRole;
  if (userRole === UserRole.STAFF) {
    const isAssigned = (job as any).assignees.some(
      (a: any) => a.userId === session?.user?.id
    );
    if (!isAssigned) {
      notFound();
    }
  }

  const statusLabel = statusLabelMap[job.status as JobStatus] ?? job.status;

  // Group updates by day
  const jobUpdates = (job as any).updates || [];
  type JobUpdateItem = (typeof jobUpdates)[number];
  type UpdateGroup = { label: string; items: JobUpdateItem[] };

  const groupedUpdates: UpdateGroup[] = jobUpdates.reduce(
    (groups: UpdateGroup[], update: JobUpdateItem) => {
      const createdAt = new Date(update.createdAt);
      const today = new Date();
      const diffDays = Math.floor(
        (today.setHours(0, 0, 0, 0) - createdAt.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      );

      let label: string;
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Yesterday';
      else label = format(createdAt, 'MMM dd, yyyy');

      const existing = groups.find((g) => g.label === label);
      if (existing) {
        existing.items.push(update);
      } else {
        groups.push({ label, items: [update] });
      }

      return groups;
    },
    [] as UpdateGroup[]
  );

  return (
    <PageContainer scrollable>
      <JobBreadcrumbSetter title={job.title} />
      <div className='flex w-full flex-col space-y-4'>
        <div className='flex items-start justify-between gap-4'>
          <Heading
            title={job.title}
            description={
              (job as any).assignees?.length > 0
                ? `${(job as any).assignees[0]?.user?.name ?? 'Unnamed'} • ${
                    (job as any).assignees[0]?.user?.email ?? ''
                  }`
                : 'Job details and activity'
            }
          />
          <div className='flex flex-col items-end gap-2'>
            <Badge
              variant='outline'
              className={cn('text-xs tracking-wide uppercase')}
            >
              {statusLabel}
            </Badge>
            {job.dueDate && (
              <p className='text-muted-foreground text-xs'>
                Due: {formatDate(job.dueDate)}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <JobDetailTabs
          overviewContent={
            <div className='flex flex-col gap-6 lg:flex-row'>
              {/* Job Summary - Left Side, Sticky */}
              <div className='lg:w-[40%] lg:shrink-0'>
                <div className='bg-card sticky top-4 space-y-4 rounded-lg border p-4'>
                  <h3 className='text-sm font-semibold'>Job Summary</h3>
                  <dl className='space-y-2 text-sm'>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Status</dt>
                      <dd className='text-right'>
                        <Badge
                          variant='outline'
                          className={cn(getJobStatusBadgeColor(job.status))}
                        >
                          {statusLabel}
                        </Badge>
                      </dd>
                    </div>
                    {job.priority && (
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-muted-foreground'>Priority</dt>
                        <dd className='text-right'>
                          <Badge
                            variant='outline'
                            className={cn(
                              String(job.priority) === 'URGENT' &&
                                'border-transparent bg-red-500 text-white',
                              String(job.priority) === 'HIGH' &&
                                'border-transparent bg-orange-500 text-white',
                              String(job.priority) === 'MEDIUM' &&
                                'border-transparent bg-yellow-500 text-white',
                              String(job.priority) === 'LOW' &&
                                'border-transparent bg-blue-500 text-white'
                            )}
                          >
                            {JOB_PRIORITY_OPTIONS.find(
                              (opt) => opt.value === String(job.priority)
                            )?.label || String(job.priority)}
                          </Badge>
                        </dd>
                      </div>
                    )}
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Created Date</dt>
                      <dd className='text-right'>
                        {formatDateTime(job.createdAt)}
                      </dd>
                    </div>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Due Date</dt>
                      <dd className='text-right'>
                        {job.dueDate ? formatDateTime(job.dueDate) : '—'}
                      </dd>
                    </div>
                    {job.completedAt && (
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-muted-foreground'>Completed At</dt>
                        <dd className='text-right'>
                          {formatDateTime(job.completedAt)}
                        </dd>
                      </div>
                    )}
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Assignees</dt>
                      <dd className='text-right'>
                        {(job as any)._count?.assignees ?? 0} total
                      </dd>
                    </div>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Activity</dt>
                      <dd className='text-muted-foreground text-right text-xs'>
                        {jobUpdates.length} updates
                      </dd>
                    </div>
                    {(job as any).event && (
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-muted-foreground'>Linked Event</dt>
                        <dd className='text-right'>
                          {(job as any).event.title}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {(job as any).assignees?.length > 0 && (
                    <div className='space-y-2 border-t pt-4'>
                      <h4 className='text-muted-foreground text-xs font-semibold uppercase'>
                        Assigned Staff
                      </h4>
                      <div className='flex flex-wrap gap-2'>
                        {(job as any).assignees.map((assignment: any) => (
                          <Badge key={assignment.id} variant='secondary'>
                            {assignment.user?.name ||
                              assignment.user?.email ||
                              'Unknown'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Details - Right Side */}
              <div className='flex-1 space-y-4'>
                {job.remarks && (
                  <div className='bg-card space-y-2 rounded-lg border p-4'>
                    <h3 className='text-sm font-semibold'>Remarks</h3>
                    <p className='text-muted-foreground text-sm whitespace-pre-line'>
                      {job.remarks}
                    </p>
                  </div>
                )}
              </div>
            </div>
          }
          discussionContent={
            <div className='mx-auto max-w-[80%]'>
              <div className='space-y-6'>
                {/* Comment Form */}
                <InlineCommentForm
                  jobId={jobId}
                  assignedUserIds={
                    (job as any).assignees?.map((a: any) => a.userId) || []
                  }
                  assignedUsers={
                    (job as any).assignees?.map((a: any) => ({
                      id: a.userId,
                      name: a.user?.name || null,
                      email: a.user?.email || ''
                    })) || []
                  }
                />

                {/* Comments List */}
                <div className='space-y-4'>
                  <h3 className='text-sm font-semibold'>Comments</h3>
                  {(() => {
                    const noteUpdates = jobUpdates.filter(
                      (update: any) => update.type === 'NOTE'
                    );
                    return noteUpdates.length > 0 ? (
                      <div className='space-y-4'>
                        {noteUpdates.map((update: any) => (
                          <CommentItem key={update.id} update={update} />
                        ))}
                      </div>
                    ) : (
                      <div className='text-muted-foreground py-8 text-center text-sm'>
                        No comments yet. Be the first to comment!
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          }
          timelineContent={
            <>
              {jobUpdates.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  No updates have been posted for this job yet.
                </p>
              ) : (
                <div className='mb-8 flex justify-center'>
                  <div className='w-full max-w-2xl space-y-8'>
                    {groupedUpdates.map((group) => (
                      <div key={group.label} className='space-y-4'>
                        <div className='flex items-center gap-2'>
                          <span className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                            {group.label}
                          </span>
                        </div>
                        <div className='relative space-y-4 pl-8'>
                          <div className='bg-border absolute top-[10px] bottom-[10px] left-3 w-px' />
                          {group.items.map((update, index) => (
                            <div key={update.id} className='relative'>
                              <div className='bg-muted-foreground/40 absolute top-2.5 -left-[23px] h-2 w-2 rounded-full' />
                              <div className='space-y-2'>
                                <div>
                                  <span className='text-muted-foreground text-xs'>
                                    {formatTimelineDate(update.createdAt)}
                                  </span>
                                </div>
                                <div className='w-full max-w-md rounded-lg border p-4'>
                                  <div className='space-y-3'>
                                    <div className='space-y-1'>
                                      <div className='flex justify-between gap-2 pb-2'>
                                        <div className='flex items-center gap-2'>
                                          <Avatar className='h-8 w-8'>
                                            <AvatarImage
                                              src={
                                                update.createdBy?.image || ''
                                              }
                                              alt={
                                                update.createdBy?.name ||
                                                update.createdBy?.email ||
                                                'User'
                                              }
                                            />
                                            <AvatarFallback>
                                              {(() => {
                                                const name =
                                                  update.createdBy?.name ||
                                                  update.createdBy?.email ||
                                                  'U';
                                                const firstName = name.includes(
                                                  '@'
                                                )
                                                  ? name.split('@')[0]
                                                  : name.split(' ')[0];
                                                return firstName
                                                  .slice(0, 1)
                                                  .toUpperCase();
                                              })()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className='flex flex-col'>
                                            <span className='text-sm font-medium'>
                                              {(() => {
                                                const name =
                                                  update.createdBy?.name ||
                                                  update.createdBy?.email ||
                                                  'Unknown';
                                                if (name.includes('@')) {
                                                  return name.split('@')[0];
                                                }
                                                return name.split(' ')[0];
                                              })()}
                                            </span>
                                            <span className='text-muted-foreground text-[10px]'>
                                              {formatTimeAgo(update.createdAt)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                          <Badge
                                            variant='outline'
                                            className={cn(
                                              'border-transparent text-[10px]',
                                              getUpdateTypeBadgeColor(
                                                update.type
                                              )
                                            )}
                                          >
                                            {update.type}
                                          </Badge>
                                          {update.status && (
                                            <Badge
                                              variant='outline'
                                              className={cn(
                                                'border-transparent text-[10px]',
                                                getJobStatusBadgeColor(
                                                  update.status
                                                )
                                              )}
                                            >
                                              {update.status.replace('_', ' ')}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div
                                        className='prose prose-sm text-muted-foreground max-w-none text-sm'
                                        dangerouslySetInnerHTML={{
                                          __html: update.message
                                        }}
                                      />
                                    </div>
                                    {update.media &&
                                      update.media.length > 0 && (
                                        <div className='flex flex-wrap gap-3'>
                                          {update.media.map((media: any) => (
                                            <JobMediaItem
                                              key={media.id}
                                              media={media}
                                              size='medium'
                                              aspectRatio='square'
                                            />
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>
      <JobUpdateModal />
    </PageContainer>
  );
}
