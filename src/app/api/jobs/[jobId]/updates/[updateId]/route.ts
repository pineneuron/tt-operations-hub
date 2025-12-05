import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';
import { JobStatus } from '@prisma/client';

type RouteParams = {
  params: Promise<{
    jobId: string;
    updateId: string;
  }>;
};

const updateUpdateSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  mediaIds: z.array(z.string()).optional().default([])
});

export async function PATCH(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, updateId } = await props.params;
    const body = await request.json();
    const validatedData = updateUpdateSchema.parse(body);

    // Get the update
    const update = await prisma.jobUpdate.findUnique({
      where: { id: updateId },
      include: {
        job: {
          select: {
            id: true
          }
        }
      }
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    if (update.jobId !== jobId) {
      return NextResponse.json(
        { error: 'Update does not belong to this job' },
        { status: 400 }
      );
    }

    // Check permissions: only the creator or admin can edit
    const userRole = session.user.role as UserRole;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

    if (update.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    // Update the update
    const updatedUpdate = await prisma.jobUpdate.update({
      where: { id: updateId },
      data: {
        message: validatedData.message
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

    // Link media to update if provided
    if (validatedData.mediaIds && validatedData.mediaIds.length > 0) {
      await prisma.jobMedia.updateMany({
        where: {
          id: { in: validatedData.mediaIds },
          jobId,
          updateId: null // Only link media that isn't already linked
        },
        data: {
          updateId: update.id
        }
      });
    }

    return NextResponse.json({ update: updatedUpdate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[JOB_UPDATE_PATCH]', error);
    return NextResponse.json(
      { message: 'Failed to update job update.' },
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

    const { jobId, updateId } = await props.params;

    // Get the update
    const update = await prisma.jobUpdate.findUnique({
      where: { id: updateId },
      include: {
        job: {
          select: {
            id: true
          }
        }
      }
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    if (update.jobId !== jobId) {
      return NextResponse.json(
        { error: 'Update does not belong to this job' },
        { status: 400 }
      );
    }

    // Check permissions: only the creator or admin can delete
    const userRole = session.user.role as UserRole;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.PLATFORM_ADMIN;

    if (update.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the update (media will be handled by cascade or we can keep them)
    await prisma.jobUpdate.delete({
      where: { id: updateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[JOB_UPDATE_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to delete job update.' },
      { status: 500 }
    );
  }
}
