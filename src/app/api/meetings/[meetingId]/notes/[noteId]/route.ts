import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { MeetingNoteType } from '@prisma/client';

type RouteParams = {
  params: Promise<{
    meetingId: string;
    noteId: string;
  }>;
};

const updateNoteSchema = z.object({
  type: z.nativeEnum(MeetingNoteType).optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.any()).optional().nullable()
});

export async function PUT(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, noteId } = await props.params;
    const body = await request.json();
    const validatedData = updateNoteSchema.parse(body);

    // Check if note exists and user has permission
    const note = await prisma.meetingNote.findUnique({
      where: { id: noteId },
      include: {
        meeting: {
          include: {
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.meetingId !== meetingId) {
      return NextResponse.json(
        { error: 'Note does not belong to this meeting' },
        { status: 400 }
      );
    }

    const userRole = session.user.role as UserRole;
    const isCreator = note.createdById === session.user.id;
    const isParticipant = note.meeting.participants.some(
      (p) => p.userId === session.user.id
    );

    // Only creator, ADMIN, or PLATFORM_ADMIN can update
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isCreator
    ) {
      return NextResponse.json(
        { error: 'Only the note creator can update it' },
        { status: 403 }
      );
    }

    // Update note
    const updateData: any = {};
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.content !== undefined)
      updateData.content = validatedData.content;
    if (validatedData.metadata !== undefined)
      updateData.metadata = validatedData.metadata;

    const updatedNote = await prisma.meetingNote.update({
      where: { id: noteId },
      data: updateData,
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
      }
    });

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[MEETING_NOTES_PUT]', error);
    return NextResponse.json(
      { message: 'Failed to update meeting note.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, noteId } = await props.params;

    // Check if note exists and user has permission
    const note = await prisma.meetingNote.findUnique({
      where: { id: noteId },
      include: {
        meeting: {
          include: {
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.meetingId !== meetingId) {
      return NextResponse.json(
        { error: 'Note does not belong to this meeting' },
        { status: 400 }
      );
    }

    const userRole = session.user.role as UserRole;
    const isCreator = note.createdById === session.user.id;
    const isOrganizer = note.meeting.organizerId === session.user.id;

    // Only creator, organizer, ADMIN, or PLATFORM_ADMIN can delete
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isCreator &&
      !isOrganizer
    ) {
      return NextResponse.json(
        { error: 'Only the note creator or meeting organizer can delete it' },
        { status: 403 }
      );
    }

    // Delete note (cascade will handle media)
    await prisma.meetingNote.delete({
      where: { id: noteId }
    });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('[MEETING_NOTES_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to delete meeting note.' },
      { status: 500 }
    );
  }
}
