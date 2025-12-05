'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { MeetingMediaItem } from './meeting-media-item';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { formatTimeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MeetingNoteType } from '@prisma/client';
import { MeetingNoteEditForm } from './meeting-note-edit-form';

interface MeetingNoteItemProps {
  note: {
    id: string;
    type: MeetingNoteType;
    content: string;
    createdAt: Date | string;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    media?: Array<{
      id: string;
      url: string;
      type: string;
      description: string | null;
      size: number | null;
    }>;
  };
}

const getNoteTypeBadgeColor = (type: MeetingNoteType) => {
  switch (type) {
    case MeetingNoteType.NOTE:
      return 'bg-blue-500 text-white';
    case MeetingNoteType.AGENDA:
      return 'bg-orange-500 text-white';
    case MeetingNoteType.MINUTES:
      return 'bg-emerald-500 text-white';
    default:
      return '';
  }
};

const getNoteTypeLabel = (type: MeetingNoteType) => {
  switch (type) {
    case MeetingNoteType.NOTE:
      return 'Note';
    case MeetingNoteType.AGENDA:
      return 'Agenda';
    case MeetingNoteType.MINUTES:
      return 'Minutes';
    default:
      return type;
  }
};

export function MeetingNoteItem({ note }: MeetingNoteItemProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit =
    session?.user?.id === note.createdBy?.id ||
    session?.user?.role === 'ADMIN' ||
    session?.user?.role === 'PLATFORM_ADMIN';

  const handleDelete = async () => {
    try {
      setLoading(true);
      const pathParts = window.location.pathname.split('/');
      const meetingId = pathParts[pathParts.indexOf('meetings') + 1];

      const res = await fetch(`/api/meetings/${meetingId}/notes/${note.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to delete note');
      }

      toast.success('Note deleted successfully');
      setOpenDelete(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <MeetingNoteEditForm
        note={note}
        onCancel={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <>
      <div className='bg-card group rounded-lg border p-4'>
        <div className='mb-3 flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={note.createdBy?.image || ''}
                alt={note.createdBy?.name || note.createdBy?.email || 'User'}
              />
              <AvatarFallback>
                {(() => {
                  const name =
                    note.createdBy?.name || note.createdBy?.email || 'U';
                  const firstName = name.includes('@')
                    ? name.split('@')[0]
                    : name.split(' ')[0];
                  return firstName.slice(0, 1).toUpperCase();
                })()}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>
                  {(() => {
                    const name =
                      note.createdBy?.name ||
                      note.createdBy?.email ||
                      'Unknown';
                    if (name.includes('@')) {
                      return name.split('@')[0];
                    }
                    return name.split(' ')[0];
                  })()}
                </span>
                <Badge
                  variant='outline'
                  className={getNoteTypeBadgeColor(note.type)}
                >
                  {getNoteTypeLabel(note.type)}
                </Badge>
              </div>
              <span className='text-muted-foreground text-xs'>
                {formatTimeAgo(note.createdAt)}
              </span>
            </div>
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                >
                  <MoreVertical className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setOpenDelete(true)}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div
          className='prose prose-sm max-w-none text-sm'
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
        {note.media && note.media.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-3'>
            {note.media.map((media) => (
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
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
