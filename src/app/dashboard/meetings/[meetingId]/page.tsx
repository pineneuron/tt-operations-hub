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
import { UserRole } from '@/types/user-role';
import { MeetingBreadcrumbSetter } from '@/components/meeting-breadcrumb-setter';
import { MeetingDetailTabs } from '@/features/meetings/components/meeting-detail-tabs';
import { Video, MapPin, Repeat, Clock, Calendar } from 'lucide-react';
import {
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_OPTIONS
} from '@/features/meetings/components/meeting-tables/options';
import { MeetingNoteForm } from '@/features/meetings/components/meeting-note-form';
import { MeetingNoteItem } from '@/features/meetings/components/meeting-note-item';
import { MeetingMediaItem } from '@/features/meetings/components/meeting-media-item';
import { MeetingEditButton } from '@/features/meetings/components/meeting-edit-button';
import { MeetingModal } from '@/features/meetings/components/meeting-modal';

type PageProps = {
  params: Promise<{
    meetingId: string;
  }>;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-500 text-white';
    case 'IN_PROGRESS':
      return 'bg-yellow-500 text-white';
    case 'COMPLETED':
      return 'bg-emerald-500 text-white';
    case 'CANCELLED':
      return 'bg-red-500 text-white';
    case 'POSTPONED':
      return 'bg-gray-500 text-white';
    default:
      return '';
  }
};

const getTypeLabel = (type: string) => {
  return MEETING_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
};

const formatDateTime = (value: Date | string) =>
  format(new Date(value), 'MMM dd, yyyy hh:mm a');

const formatDate = (value: Date | string) =>
  format(new Date(value), 'MMM dd, yyyy');

const formatTime = (value: Date | string) => format(new Date(value), 'h:mm a');

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

const getNoteTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'NOTE':
      return 'bg-blue-500 hover:bg-blue-600 text-white border-transparent';
    case 'AGENDA':
      return 'bg-orange-500 hover:bg-orange-600 text-white border-transparent';
    case 'MINUTES':
      return 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent';
    default:
      return '';
  }
};

export const metadata = {
  title: 'Dashboard: Meeting Details'
};

export default async function MeetingDetailPage(props: PageProps) {
  const session = await auth();
  const { meetingId } = await props.params;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
      notes: {
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
      media: {
        where: {
          noteId: null
        },
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
      recurrence: true,
      reminders: {
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
      _count: {
        select: {
          participants: true,
          notes: true,
          media: true
        }
      }
    }
  });

  if (!meeting) {
    notFound();
  }

  const userRole = session?.user?.role as UserRole;
  const isOrganizer = meeting.organizerId === session?.user?.id;
  const canEdit =
    isOrganizer ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.PLATFORM_ADMIN;

  // Group notes by date
  type MeetingNoteItem = (typeof meeting.notes)[number];
  type NoteGroup = { label: string; items: MeetingNoteItem[] };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const groupedNotes: NoteGroup[] = [];
  let currentGroup: NoteGroup | null = null;

  meeting.notes.forEach((note: any) => {
    const noteDate = new Date(note.createdAt);
    const noteDateOnly = new Date(
      noteDate.getFullYear(),
      noteDate.getMonth(),
      noteDate.getDate()
    );

    let label = '';
    if (noteDateOnly.getTime() === today.getTime()) {
      label = 'Today';
    } else if (noteDateOnly.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else if (noteDate >= thisWeek) {
      label = 'This Week';
    } else {
      label = formatDate(note.createdAt);
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [] };
      groupedNotes.push(currentGroup);
    }
    currentGroup.items.push(note);
  });

  // Get participant IDs for @mentions
  const participantIds = meeting.participants.map((p: any) => p.userId);
  const participantUsers = meeting.participants.map((p: any) => ({
    id: p.user.id,
    name: p.user.name,
    email: p.user.email
  }));

  // Build timeline activities
  type TimelineActivity = {
    id: string;
    type: 'MEETING_CREATED' | 'NOTE_ADDED';
    createdAt: Date | string;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    content?: string;
    noteType?: string;
    media?: Array<{
      id: string;
      url: string;
      type: string;
      description: string | null;
      size: number | null;
    }>;
  };

  const timelineActivities: TimelineActivity[] = [];

  // Add meeting creation activity
  timelineActivities.push({
    id: `meeting-${meeting.id}`,
    type: 'MEETING_CREATED',
    createdAt: meeting.createdAt,
    createdBy: meeting.organizer
  });

  // Add notes as activities
  meeting.notes.forEach((note: any) => {
    timelineActivities.push({
      id: note.id,
      type: 'NOTE_ADDED',
      createdAt: note.createdAt,
      createdBy: note.createdBy,
      content: note.content,
      noteType: note.type,
      media: note.media || []
    });
  });

  // Sort by date (newest first)
  timelineActivities.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Group activities by date
  type ActivityGroup = { label: string; items: TimelineActivity[] };
  const groupedActivities: ActivityGroup[] = timelineActivities.reduce(
    (groups: ActivityGroup[], activity: TimelineActivity) => {
      const createdAt = new Date(activity.createdAt);
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
        existing.items.push(activity);
      } else {
        groups.push({ label, items: [activity] });
      }

      return groups;
    },
    [] as ActivityGroup[]
  );

  return (
    <PageContainer scrollable={false}>
      <MeetingBreadcrumbSetter title={meeting.title} />
      <div className='flex flex-1 flex-col space-y-4'>
        {/* Header */}
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center gap-3'>
              <Heading title={meeting.title} description='' />
              {meeting.isRecurring && (
                <Repeat className='text-muted-foreground h-5 w-5' />
              )}
            </div>
            <div className='mt-2 flex items-center gap-2'>
              <Badge
                variant='outline'
                className={cn(getStatusColor(meeting.status))}
              >
                {MEETING_STATUS_OPTIONS.find(
                  (opt) => opt.value === meeting.status
                )?.label || meeting.status}
              </Badge>
              <Badge variant='outline'>{getTypeLabel(meeting.type)}</Badge>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {canEdit && <MeetingEditButton meetingId={meeting.id} />}
          </div>
        </div>

        <Separator />

        <MeetingDetailTabs
          overviewContent={
            <div className='flex flex-col gap-6 lg:flex-row'>
              {/* Meeting Summary - Left Side, Sticky */}
              <div className='lg:w-[40%] lg:shrink-0'>
                <div className='bg-card sticky top-4 space-y-4 rounded-lg border p-4'>
                  <h3 className='text-sm font-semibold'>Meeting Summary</h3>
                  <dl className='space-y-3 text-sm'>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Organizer</dt>
                      <dd className='text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          {/* <Avatar className='h-6 w-6'>
                            <AvatarImage src={meeting.organizer.image || undefined} />
                            <AvatarFallback>
                              {meeting.organizer.name?.[0]?.toUpperCase() || meeting.organizer.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar> */}
                          <div>
                            <p>{meeting.organizer.name || 'Unnamed'}</p>
                            <p className='text-muted-foreground text-xs'>
                              {meeting.organizer.email}
                            </p>
                          </div>
                        </div>
                      </dd>
                    </div>

                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Date & Time</dt>
                      <dd className='text-right'>
                        <div className='flex items-center justify-end gap-1.5'>
                          {/* <Calendar className='text-muted-foreground h-3.5 w-3.5' /> */}
                          <div>
                            <p>{formatDate(meeting.startTime)}</p>
                            <p className='text-muted-foreground text-xs'>
                              {formatTime(meeting.startTime)} -{' '}
                              {formatTime(meeting.endTime)}
                            </p>
                          </div>
                        </div>
                      </dd>
                    </div>

                    {meeting.location && (
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-muted-foreground'>Location</dt>
                        <dd className='text-right'>
                          <div className='flex items-center justify-end gap-1.5'>
                            {/* <MapPin className='text-muted-foreground h-3.5 w-3.5' /> */}
                            <span>{meeting.location}</span>
                          </div>
                        </dd>
                      </div>
                    )}

                    {meeting.meetingLink && (
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-muted-foreground'>Meeting Link</dt>
                        <dd className='text-right'>
                          <a
                            href={meeting.meetingLink}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary flex items-center gap-1.5 hover:underline'
                          >
                            <Video className='h-3.5 w-3.5' />
                            Join Meeting
                          </a>
                        </dd>
                      </div>
                    )}

                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Type</dt>
                      <dd className='text-right'>
                        <Badge variant='outline'>
                          {getTypeLabel(meeting.type)}
                        </Badge>
                      </dd>
                    </div>

                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>Status</dt>
                      <dd className='text-right'>
                        <Badge
                          variant='outline'
                          className={cn(getStatusColor(meeting.status))}
                        >
                          {MEETING_STATUS_OPTIONS.find(
                            (opt) => opt.value === meeting.status
                          )?.label || meeting.status}
                        </Badge>
                      </dd>
                    </div>

                    {meeting.isRecurring && meeting.recurrence && (
                      <>
                        <div className='flex items-start justify-between gap-4'>
                          <dt className='text-muted-foreground'>Recurrence</dt>
                          <dd className='text-right'>
                            <div className='flex items-center justify-end gap-1.5'>
                              <Repeat className='text-muted-foreground h-3.5 w-3.5' />
                              <span>
                                {meeting.recurrence.frequency.replace('_', ' ')}
                                {meeting.recurrence.interval > 1 &&
                                  ` (Every ${meeting.recurrence.interval})`}
                              </span>
                            </div>
                          </dd>
                        </div>
                        {meeting.recurrence.endDate && (
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='text-muted-foreground'>
                              Recurrence End
                            </dt>
                            <dd className='text-right'>
                              {formatDate(meeting.recurrence.endDate)}
                            </dd>
                          </div>
                        )}
                      </>
                    )}

                    {meeting.reminders.length > 0 && (
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-muted-foreground'>Reminders</dt>
                        <dd className='text-right'>
                          <div className='flex flex-col items-end gap-1'>
                            {(() => {
                              // Get all unique reminder minutes
                              const allMinutes = new Set<number>();
                              meeting.reminders.forEach((reminder: any) => {
                                reminder.reminderMinutes.forEach(
                                  (min: number) => allMinutes.add(min)
                                );
                              });
                              const sortedMinutes = Array.from(allMinutes).sort(
                                (a, b) => b - a
                              );

                              return sortedMinutes.map((minutes) => (
                                <div
                                  key={minutes}
                                  className='flex items-center gap-1.5'
                                >
                                  <Clock className='text-muted-foreground h-3.5 w-3.5' />
                                  <span className='text-xs'>
                                    {minutes >= 60
                                      ? `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''} before`
                                      : `${minutes} minute${minutes > 1 ? 's' : ''} before`}
                                  </span>
                                </div>
                              ));
                            })()}
                          </div>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Right Side - Scrollable Content */}
              <div className='flex-1 space-y-6'>
                {/* Agenda */}
                {meeting.agenda && (
                  <div className='bg-card rounded-lg border p-4'>
                    <h3 className='mb-3 text-sm font-semibold'>Agenda</h3>
                    <div className='prose prose-sm max-w-none text-sm whitespace-pre-wrap'>
                      {meeting.agenda}
                    </div>
                  </div>
                )}

                {/* Participants */}
                <div className='bg-card rounded-lg border p-4'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h3 className='text-sm font-semibold'>
                      Participants ({meeting._count.participants})
                    </h3>
                  </div>
                  <div className='space-y-3'>
                    {meeting.participants.map((participant: any) => (
                      <div
                        key={participant.id}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-8 w-8'>
                            <AvatarImage
                              src={participant.user.image || undefined}
                            />
                            <AvatarFallback>
                              {participant.user.name?.[0]?.toUpperCase() ||
                                participant.user.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className='text-sm font-medium'>
                              {participant.user.name || 'Unnamed'}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              {participant.user.email}
                            </p>
                          </div>
                        </div>
                        <Badge variant='outline' className='text-xs'>
                          {participant.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                {meeting.media.length > 0 && (
                  <div className='bg-card rounded-lg border p-4'>
                    <h3 className='mb-3 text-sm font-semibold'>
                      Attachments ({meeting._count.media})
                    </h3>
                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'>
                      {meeting.media.map((media: any) => (
                        <MeetingMediaItem key={media.id} media={media} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
          notesContent={
            <div className='mx-auto max-w-[80%]'>
              <div className='space-y-6'>
                {/* Note Form */}
                <MeetingNoteForm
                  meetingId={meeting.id}
                  assignedUserIds={participantIds}
                  assignedUsers={participantUsers}
                />

                {/* Notes List */}
                <div className='space-y-4'>
                  <h3 className='text-sm font-semibold'>Notes</h3>
                  {groupedNotes.length === 0 ? (
                    <div className='text-muted-foreground py-8 text-center text-sm'>
                      No notes have been added to this meeting yet.
                    </div>
                  ) : (
                    groupedNotes.map((group) => (
                      <div key={group.label} className='space-y-4'>
                        <h4 className='text-muted-foreground text-xs font-semibold uppercase'>
                          {group.label}
                        </h4>
                        {group.items.map((note) => (
                          <MeetingNoteItem key={note.id} note={note} />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          }
          timelineContent={
            <>
              {timelineActivities.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  No activities have been recorded for this meeting yet.
                </p>
              ) : (
                <div className='mb-8 flex justify-center'>
                  <div className='w-full max-w-2xl space-y-8'>
                    {groupedActivities.map((group) => (
                      <div key={group.label} className='space-y-4'>
                        <div className='flex items-center gap-2'>
                          <span className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                            {group.label}
                          </span>
                        </div>
                        <div className='relative space-y-4 pl-8'>
                          <div className='bg-border absolute top-[10px] bottom-[10px] left-3 w-px' />
                          {group.items.map((activity, index) => (
                            <div key={activity.id} className='relative'>
                              <div className='bg-muted-foreground/40 absolute top-2.5 -left-[23px] h-2 w-2 rounded-full' />
                              <div className='space-y-2'>
                                <div>
                                  <span className='text-muted-foreground text-xs'>
                                    {formatTimelineDate(activity.createdAt)}
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
                                                activity.createdBy?.image || ''
                                              }
                                              alt={
                                                activity.createdBy?.name ||
                                                activity.createdBy?.email ||
                                                'User'
                                              }
                                            />
                                            <AvatarFallback>
                                              {(() => {
                                                const name =
                                                  activity.createdBy?.name ||
                                                  activity.createdBy?.email ||
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
                                                  activity.createdBy?.name ||
                                                  activity.createdBy?.email ||
                                                  'Unknown';
                                                if (name.includes('@')) {
                                                  return name.split('@')[0];
                                                }
                                                return name.split(' ')[0];
                                              })()}
                                            </span>
                                            <span className='text-muted-foreground text-[10px]'>
                                              {formatTimeAgo(
                                                activity.createdAt
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                          {activity.type ===
                                          'MEETING_CREATED' ? (
                                            <Badge
                                              variant='outline'
                                              className='border-transparent bg-emerald-500 text-[10px] text-white hover:bg-emerald-600'
                                            >
                                              MEETING CREATED
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant='outline'
                                              className={cn(
                                                'border-transparent text-[10px]',
                                                getNoteTypeBadgeColor(
                                                  activity.noteType || 'NOTE'
                                                )
                                              )}
                                            >
                                              {activity.noteType?.replace(
                                                '_',
                                                ' '
                                              ) || 'NOTE'}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      {activity.type === 'MEETING_CREATED' ? (
                                        <p className='text-muted-foreground text-sm'>
                                          Meeting was created
                                        </p>
                                      ) : activity.content ? (
                                        <div
                                          className='prose prose-sm text-muted-foreground max-w-none text-sm'
                                          dangerouslySetInnerHTML={{
                                            __html: activity.content
                                          }}
                                        />
                                      ) : null}
                                    </div>
                                    {activity.media &&
                                      activity.media.length > 0 && (
                                        <div className='flex flex-wrap gap-3'>
                                          {activity.media.map((media: any) => (
                                            <MeetingMediaItem
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
      <MeetingModal />
    </PageContainer>
  );
}
