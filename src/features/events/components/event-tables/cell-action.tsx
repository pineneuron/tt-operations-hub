'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconEye,
  IconPencil,
  IconTrash,
  IconMessage,
  IconFileText,
  IconExternalLink
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { EventListItem } from '@/features/events/types';
import { useEventModal } from '@/features/events/hooks/use-event-modal';
import { useEventUpdateModal } from '@/features/events/hooks/use-event-update-modal';
import { UserRole } from '@/types/user-role';
import { useSession } from 'next-auth/react';
import { cn, formatBytes } from '@/lib/utils';
import { EventMediaType } from '@prisma/client';
import Image from 'next/image';

interface CellActionProps {
  data: EventListItem;
}

const formatDate = (value: string) => format(new Date(value), 'MMM dd, yyyy');
const formatDateTime = (value: string) =>
  format(new Date(value), 'MMM dd, yyyy hh:mm a');

const formatTimeAgo = (value: string) => {
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
    default:
      return '';
  }
};

export function EventCellAction({ data }: CellActionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole;
  const { openModal } = useEventModal();
  const { openModal: openUpdateModal } = useEventUpdateModal();
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [expandedUpdateIds, setExpandedUpdateIds] = useState<Set<string>>(
    () => new Set()
  );
  const [mediaSizes, setMediaSizes] = useState<Record<string, number>>({});

  const canEdit =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;
  const canDelete =
    userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

  const fetchEventDetails = async () => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/events/${data.id}`);
      if (response.ok) {
        const result = await response.json();
        setEventDetails(result.event);
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchUpdates = async () => {
    setLoadingUpdates(true);
    try {
      const res = await fetch(`/api/events/${data.id}/updates`);
      if (res.ok) {
        const json = await res.json();
        setUpdates(json.updates || []);
      }
    } catch (error) {
      console.error('Failed to fetch event updates:', error);
    } finally {
      setLoadingUpdates(false);
    }
  };

  // Fetch attachment sizes (bytes) via HEAD requests so we can show size labels
  useEffect(() => {
    const controller = new AbortController();

    const fetchSizes = async () => {
      const pendingMedia: { id: string; url: string }[] = [];

      updates.forEach((update: any) => {
        (update.media || []).forEach((media: any) => {
          if (media.url && !mediaSizes[media.id]) {
            pendingMedia.push({ id: media.id, url: media.url });
          }
        });
      });

      for (const media of pendingMedia) {
        try {
          const res = await fetch(media.url, {
            method: 'HEAD',
            signal: controller.signal
          });
          const len = res.headers.get('content-length');
          if (len) {
            const bytes = parseInt(len, 10);
            if (!Number.isNaN(bytes)) {
              setMediaSizes((prev) =>
                prev[media.id] ? prev : { ...prev, [media.id]: bytes }
              );
            }
          }
        } catch {
          // ignore failures, we just won't show size
        }
      }
    };

    if (updates.length > 0) {
      fetchSizes();
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates]);

  const handleOpenView = () => {
    setOpenView(true);
    fetchEventDetails();
    fetchUpdates();
  };

  // Posting updates is handled by the separate EventUpdateModal.

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${data.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete event');
      }

      toast.success('Event deleted successfully');
      setOpenDelete(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <span className='text-muted-foreground'>⋯</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleOpenView}>
            <IconEye className='h-4 w-4' />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openUpdateModal(data.id, data.title)}
          >
            <IconMessage className='h-4 w-4' />
            Add Update
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onClick={() => openModal(data.id)}>
              <IconPencil className='h-4 w-4' />
              Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setOpenDelete(true)}
                className='text-destructive'
              >
                <IconTrash className='h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Details Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className='!grid max-h-[calc(100vh-2rem)] !grid-rows-[auto_1fr] gap-0 p-0 sm:max-w-2xl'>
          <DialogHeader className='px-6 pt-6 pb-4'>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              View complete details of this event.
            </DialogDescription>
            <a
              href={`/dashboard/events/${data.id}`}
              className='text-primary flex items-center gap-1 text-sm underline underline-offset-2'
            >
              Open full page <IconExternalLink className='h-4 w-4' />
            </a>
          </DialogHeader>
          <div className='[&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 max-h-[calc(100vh-15rem)] space-y-6 overflow-y-auto px-6 pb-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Title
                </p>
                <p className='text-sm'>{data.title}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Status
                </p>
                <Badge className={cn(getStatusColor(data.status))}>
                  {data.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Client
                </p>
                <p className='text-sm'>{data.clientName || 'Unnamed client'}</p>
                <p className='text-muted-foreground text-xs'>
                  {data.clientEmail}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Venue
                </p>
                <p className='text-sm'>{data.venue || '—'}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Start Date
                </p>
                <p className='text-sm'>{formatDateTime(data.startDate)}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  End Date
                </p>
                <p className='text-sm'>{formatDateTime(data.endDate)}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Participants
                </p>
                <p className='text-sm'>{data.participantCount}</p>
              </div>
            </div>
            {eventDetails && (
              <div>
                <p className='text-muted-foreground mb-2 text-sm font-medium'>
                  Assigned Staff
                </p>
                {loadingDetails ? (
                  <p className='text-muted-foreground text-sm'>Loading...</p>
                ) : eventDetails.participants?.filter(
                    (p: any) => p.role === 'STAFF'
                  ).length > 0 ? (
                  <div className='flex flex-wrap gap-2'>
                    {eventDetails.participants
                      .filter((p: any) => p.role === 'STAFF')
                      .map((participant: any) => (
                        <Badge key={participant.id} variant='secondary'>
                          {participant.user?.name ||
                            participant.user?.email ||
                            'Unknown'}
                        </Badge>
                      ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground text-sm'>
                    No staff assigned
                  </p>
                )}
              </div>
            )}
            {data.description && (
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Description
                </p>
                <p className='text-sm'>{data.description}</p>
              </div>
            )}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <p className='text-muted-foreground text-sm font-medium'>
                  Event Updates
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openUpdateModal(data.id, data.title)}
                >
                  Add Update
                </Button>
              </div>

              {/* Updates timeline */}
              <div className='space-y-2'>
                {loadingUpdates && (
                  <p className='text-muted-foreground text-sm'>
                    Loading updates...
                  </p>
                )}
                {!loadingUpdates && updates.length === 0 && (
                  <p className='text-muted-foreground text-sm'>
                    No updates have been posted for this event yet.
                  </p>
                )}
                {!loadingUpdates &&
                  (() => {
                    let lastGroupLabel: string | null = null;

                    return updates.map((update) => {
                      const isExpanded = expandedUpdateIds.has(update.id);
                      const message = update.message as string;
                      const isLong = message && message.length > 240;
                      const displayedMessage =
                        isExpanded || !isLong
                          ? message
                          : `${message.slice(0, 240)}…`;

                      const toggleExpanded = () => {
                        setExpandedUpdateIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(update.id)) {
                            next.delete(update.id);
                          } else {
                            next.add(update.id);
                          }
                          return next;
                        });
                      };

                      const createdAt = new Date(update.createdAt);
                      const today = new Date();
                      const diffDays = Math.floor(
                        (today.setHours(0, 0, 0, 0) -
                          createdAt.setHours(0, 0, 0, 0)) /
                          (1000 * 60 * 60 * 24)
                      );

                      let groupLabel: string;
                      if (diffDays === 0) groupLabel = 'Today';
                      else if (diffDays === 1) groupLabel = 'Yesterday';
                      else groupLabel = format(createdAt, 'MMM dd, yyyy');

                      const showGroupHeader = groupLabel !== lastGroupLabel;
                      lastGroupLabel = groupLabel;

                      // Derive a friendly file name from URL if available (used below)
                      return (
                        <div key={update.id} className='space-y-2'>
                          {showGroupHeader && (
                            <p className='text-muted-foreground text-[11px] font-semibold uppercase'>
                              {groupLabel}
                            </p>
                          )}
                          <div className='bg-background space-y-2 rounded-md border p-3'>
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex flex-col'>
                                <span className='text-sm font-medium'>
                                  {update.createdBy?.name ||
                                    update.createdBy?.email ||
                                    'Unknown'}
                                </span>
                                <span className='text-muted-foreground text-xs'>
                                  {formatTimeAgo(update.createdAt)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Badge
                                  variant='outline'
                                  className='text-[11px]'
                                >
                                  {update.type}
                                </Badge>
                                {update.status && (
                                  <Badge
                                    variant='secondary'
                                    className='text-[11px]'
                                  >
                                    {update.status.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className='text-sm whitespace-pre-line'>
                              {displayedMessage}
                            </p>
                            {isLong && (
                              <button
                                type='button'
                                onClick={toggleExpanded}
                                className='text-muted-foreground text-xs underline underline-offset-2'
                              >
                                {isExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                            {update.media && update.media.length > 0 && (
                              <div className='mt-2 flex flex-wrap gap-3'>
                                {update.media.map((media: any) => {
                                  const isDocument =
                                    media.type === EventMediaType.DOCUMENT ||
                                    media.type === EventMediaType.OTHER;
                                  const isImage =
                                    media.type === EventMediaType.PHOTO;

                                  let fileName: string | null = null;
                                  let extension: string | null = null;
                                  try {
                                    const urlObj = new URL(media.url);
                                    fileName = decodeURIComponent(
                                      urlObj.pathname.split('/').pop() || ''
                                    );
                                    const parts = fileName.split('.');
                                    if (parts.length > 1) {
                                      extension = parts.pop() || null;
                                    }
                                  } catch {
                                    fileName = null;
                                    extension = null;
                                  }

                                  const typeLabel =
                                    extension?.toUpperCase() ||
                                    (isImage ? 'IMAGE' : 'FILE');

                                  const bytes = mediaSizes[media.id];
                                  const sizeLabel =
                                    typeof bytes === 'number'
                                      ? formatBytes(bytes, { decimals: 1 })
                                      : null;

                                  const metaLabel = [typeLabel, sizeLabel]
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
                                      <div
                                        className={cn(
                                          'relative block h-16 w-16 overflow-hidden rounded-md border',
                                          isDocument
                                            ? 'bg-muted/50 flex items-center justify-center'
                                            : 'bg-muted'
                                        )}
                                      >
                                        {isImage ? (
                                          <Image
                                            src={media.url}
                                            alt={
                                              media.description || 'Event media'
                                            }
                                            width={64}
                                            height={64}
                                            className='h-full w-full object-cover transition-transform group-hover:scale-105'
                                          />
                                        ) : (
                                          <IconFileText className='text-muted-foreground size-6' />
                                        )}
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
                        </div>
                      );
                    });
                  })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.title}&quot;? This
              action cannot be undone and will delete all associated data
              including updates, reports, and media.
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => setOpenDelete(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
