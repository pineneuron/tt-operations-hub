import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatBytes } from '@/lib/utils';
import { EventStatus } from '@prisma/client';
import { EventMediaItem } from '@/components/event-media-item';
import { EventBreadcrumbSetter } from '@/components/event-breadcrumb-setter';
import { EventDetailTabs } from '@/features/events/components/event-detail-tabs';

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const statusLabelMap: Record<EventStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

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

const getEventStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-gray-500 hover:bg-gray-600 text-white border-transparent';
    case 'IN_PROGRESS':
      return 'bg-blue-500 hover:bg-blue-600 text-white border-transparent';
    case 'COMPLETED':
      return 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent';
    case 'CANCELLED':
      return 'bg-red-500 hover:bg-red-600 text-white border-transparent';
    default:
      return '';
  }
};

const formatDate = (value: Date | string) =>
  format(new Date(value), 'MMM dd, yyyy');

const formatDateTime = (value: Date | string) =>
  format(new Date(value), 'MMM dd, yyyy hh:mm a');

const formatTimelineDate = (value: Date | string) => {
  const date = new Date(value);
  const dayName = format(date, 'EEE');
  const month = format(date, 'MMM');
  const day = date.getDate();
  const year = format(date, 'yyyy');
  const time = format(date, 'h:mm a');

  // Add ordinal suffix (st, nd, rd, th)
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return `${dayName}, ${month} ${day}${getOrdinal(day)} ${year}, ${time}`;
};

const formatTimeAgo = (value: Date | string) => {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minute${
      remainingMinutes === 1 ? '' : 's'
    } ago`;
  }
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (weeks < 4) {
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  const safeMonths = months || 1;
  return `${safeMonths} month${safeMonths === 1 ? '' : 's'} ago`;
};

export const metadata = {
  title: 'Dashboard: Event Details'
};

export default async function EventDetailPage(props: PageProps) {
  const { eventId } = await props.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
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
          media: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      reports: {
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attachments: true
        },
        orderBy: {
          createdAt: 'desc'
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      _count: {
        select: {
          participants: true,
          updates: true,
          reports: true
        }
      }
    }
  });

  if (!event) {
    notFound();
  }

  const staffParticipants =
    event.participants?.filter((p) => p.role === 'STAFF') ?? [];

  const statusLabel =
    statusLabelMap[event.status as EventStatus] ?? event.status;

  // Group updates by day for a more readable timeline
  type EventUpdateItem = (typeof event.updates)[number];
  type UpdateGroup = { label: string; items: EventUpdateItem[] };

  const groupedUpdates: UpdateGroup[] = event.updates.reduce(
    (groups: UpdateGroup[], update: EventUpdateItem) => {
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
      <EventBreadcrumbSetter eventTitle={event.title} />
      <div className='flex w-full flex-col space-y-4'>
        <div className='flex items-start justify-between gap-4'>
          <Heading
            title={event.title}
            description={
              event.client
                ? `${event.client.name ?? 'Unnamed client'} • ${
                    event.client.email
                  }`
                : 'Event details and activity'
            }
          />
          <div className='flex flex-col items-end gap-2'>
            <Badge
              variant='outline'
              className={cn('text-xs tracking-wide uppercase')}
            >
              {statusLabel}
            </Badge>
            <p className='text-muted-foreground text-xs'>
              {formatDate(event.startDate)} – {formatDate(event.endDate)}
            </p>
          </div>
        </div>

        <Separator />

        <EventDetailTabs
          overviewContent={
            <div className='flex flex-col gap-6 lg:flex-row'>
              <div className='bg-card flex-1 space-y-4 rounded-lg border p-4'>
                <h3 className='text-sm font-semibold'>Event Summary</h3>
                <dl className='space-y-2 text-sm'>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground'>Client</dt>
                    <dd className='text-right'>
                      <p>{event.client?.name ?? 'Unnamed client'}</p>
                      {event.client?.email && (
                        <p className='text-muted-foreground text-xs'>
                          {event.client.email}
                        </p>
                      )}
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground'>Venue</dt>
                    <dd className='text-right'>{event.venue ?? '—'}</dd>
                  </div>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground'>Dates</dt>
                    <dd className='text-right'>
                      <p>{formatDateTime(event.startDate)}</p>
                      <p className='text-muted-foreground text-xs'>
                        to {formatDateTime(event.endDate)}
                      </p>
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground'>Participants</dt>
                    <dd className='text-right'>
                      {event._count?.participants ?? 0} total
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground'>Activity</dt>
                    <dd className='text-muted-foreground text-right text-xs'>
                      {event._count?.updates ?? 0} updates ·{' '}
                      {event._count?.reports ?? 0} reports
                    </dd>
                  </div>
                </dl>

                {staffParticipants.length > 0 && (
                  <div className='space-y-2'>
                    <h4 className='text-muted-foreground text-xs font-semibold uppercase'>
                      Assigned Staff
                    </h4>
                    <div className='flex flex-wrap gap-2'>
                      {staffParticipants.map((p) => (
                        <Badge key={p.id} variant='secondary'>
                          {p.user?.name || p.user?.email || 'Unknown'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className='flex-1 space-y-4'>
                {event.featuredImageUrl && (
                  <div className='bg-muted relative h-80 overflow-hidden rounded-lg border'>
                    <Image
                      src={event.featuredImageUrl}
                      alt={event.title}
                      fill
                      className='object-cover'
                    />
                  </div>
                )}
                {event.description && (
                  <div className='space-y-1'>
                    <h3 className='text-sm font-semibold'>Description</h3>
                    <p className='text-muted-foreground text-sm whitespace-pre-line'>
                      {event.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          }
          updatesContent={
            <>
              {event.updates.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  No updates have been posted for this event yet.
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
                                                getEventStatusBadgeColor(
                                                  update.status
                                                )
                                              )}
                                            >
                                              {update.status.replace('_', ' ')}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <p className='text-muted-foreground text-sm whitespace-pre-line'>
                                        {update.message}
                                      </p>
                                    </div>
                                    {update.media &&
                                      update.media.length > 0 && (
                                        <div className='flex flex-wrap gap-3'>
                                          {update.media.map((media) => (
                                            <EventMediaItem
                                              key={media.id}
                                              media={media}
                                              size='medium'
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
          reportsContent={
            <>
              {event.reports.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  No reports have been submitted for this event yet.
                </p>
              ) : (
                <div className='space-y-3'>
                  {event.reports.map((report) => (
                    <div
                      key={report.id}
                      className='bg-background space-y-2 rounded-md border p-3'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex flex-col'>
                          <span className='text-sm font-medium'>
                            {report.submittedBy?.name ||
                              report.submittedBy?.email ||
                              'Unknown'}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            {formatDateTime(report.createdAt)}
                          </span>
                        </div>
                      </div>
                      {report.summary && (
                        <p className='text-sm whitespace-pre-line'>
                          {report.summary}
                        </p>
                      )}
                      {report.attachments && report.attachments.length > 0 && (
                        <div className='mt-2 flex flex-wrap gap-3'>
                          {report.attachments.map((media) => {
                            const bytes = (media as any).size as
                              | number
                              | undefined;
                            const sizeLabel =
                              typeof bytes === 'number'
                                ? formatBytes(bytes, { decimals: 1 })
                                : null;

                            const metaLabel = ['ATTACHMENT', sizeLabel]
                              .filter(Boolean)
                              .join(' · ');

                            return (
                              <a
                                key={media.id}
                                href={media.url}
                                target='_blank'
                                rel='noreferrer'
                                className='group flex flex-col items-center gap-1 text-center'
                              >
                                <div className='bg-muted/50 flex h-16 w-16 items-center justify-center rounded-md border'>
                                  <span className='text-muted-foreground text-[10px] font-medium'>
                                    FILE
                                  </span>
                                </div>
                                {metaLabel && (
                                  <span className='text-muted-foreground text-[10px]'>
                                    {metaLabel}
                                  </span>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          }
          mediaContent={
            <>
              {event.media.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  No media have been uploaded for this event yet.
                </p>
              ) : (
                <div className='grid grid-cols-4 gap-3'>
                  {event.media.map((media) => (
                    <EventMediaItem
                      key={media.id}
                      media={media}
                      aspectRatio='video'
                    />
                  ))}
                </div>
              )}
            </>
          }
        />
      </div>
    </PageContainer>
  );
}
