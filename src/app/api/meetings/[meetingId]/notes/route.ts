import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { MeetingNoteType } from '@prisma/client';

type RouteParams = {
  params: Promise<{
    meetingId: string;
  }>;
};

const createNoteSchema = z.object({
  type: z.nativeEnum(MeetingNoteType).default(MeetingNoteType.NOTE),
  content: z.string().min(1, 'Content is required'),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
  mediaIds: z.array(z.string()).optional().default([])
});

export async function GET(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await props.params;

    // Check if user has access to this meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;
    const isParticipant = meeting.participants.some(
      (p) => p.userId === session.user.id
    );

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isParticipant
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const notes = await prisma.meetingNote.findMany({
      where: { meetingId },
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
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('[MEETING_NOTES_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await props.params;
    const body = await request.json();
    const validatedData = createNoteSchema.parse(body);

    // Check if user has access to this meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const userRole = session.user.role as UserRole;
    const isParticipant = meeting.participants.some(
      (p) => p.userId === session.user.id
    );

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.PLATFORM_ADMIN &&
      !isParticipant
    ) {
      return NextResponse.json(
        { error: 'You must be a participant to add notes' },
        { status: 403 }
      );
    }

    // Create note
    const note = await prisma.meetingNote.create({
      data: {
        meetingId,
        createdById: session.user.id,
        type: validatedData.type,
        content: validatedData.content,
        metadata: validatedData.metadata ?? undefined
      },
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
      }
    });

    // Link media if provided
    if (validatedData.mediaIds && validatedData.mediaIds.length > 0) {
      await prisma.meetingMedia.updateMany({
        where: {
          id: { in: validatedData.mediaIds },
          meetingId,
          noteId: null
        },
        data: {
          noteId: note.id
        }
      });
    }

    // Send notification to other participants
    const otherParticipants = meeting.participants
      .map((p) => p.userId)
      .filter((id) => id !== session.user.id);

    if (otherParticipants.length > 0) {
      const notification = await prisma.notification.create({
        data: {
          category: 'MEETING',
          title: `New note added to meeting: ${meeting.title}`,
          body: `${session.user.name || session.user.email} added a ${validatedData.type.toLowerCase()}`,
          entityType: 'MEETING',
          entityId: meetingId,
          createdById: session.user.id
        }
      });

      await prisma.notificationReceipt.createMany({
        data: otherParticipants.map((userId) => ({
          notificationId: notification.id,
          userId,
          channel: 'IN_APP'
        }))
      });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[MEETING_NOTES_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create meeting note.' },
      { status: 500 }
    );
  }
}
