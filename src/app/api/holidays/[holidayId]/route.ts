import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';

const updateHolidaySchema = z.object({
  category: z.string().min(1, 'Category is required.').optional(),
  date: z.string().datetime().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  isRecurring: z.boolean().optional(),
  description: z.string().optional().nullable()
});

type RouteParams = {
  params: Promise<{ holidayId: string }>;
};

export async function GET(_: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await props.params;
    const { holidayId } = params;

    const holiday = await prisma.nepaliHoliday.findUnique({
      where: { id: holidayId }
    });

    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }

    return NextResponse.json({ holiday });
  } catch (error) {
    console.error('Get holiday error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holiday' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, props: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await props.params;
    const { holidayId } = params;

    const holiday = await prisma.nepaliHoliday.findUnique({
      where: { id: holidayId }
    });

    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateHolidaySchema.parse(body);

    // If category, date, or year is being updated, check for duplicates
    if (data.category || data.date || data.year !== undefined) {
      const category = data.category ?? holiday.category;
      let date = data.date ? new Date(data.date) : holiday.date;
      // Set time to midnight to match date-only comparison
      if (data.date) {
        date.setUTCHours(0, 0, 0, 0);
      }
      const year = data.year ?? holiday.year;

      const existing = await prisma.nepaliHoliday.findFirst({
        where: {
          category,
          date,
          year,
          id: { not: holidayId }
        }
      });

      if (existing && existing.id !== holidayId) {
        return NextResponse.json(
          {
            error: 'Holiday already exists for this category, date, and year.'
          },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (data.category) updateData.category = data.category;
    if (data.date) {
      const dateObj = new Date(data.date);
      dateObj.setUTCHours(0, 0, 0, 0);
      updateData.date = dateObj;
    }
    if (data.year !== undefined) updateData.year = data.year;
    if (data.isRecurring !== undefined)
      updateData.isRecurring = data.isRecurring;
    if (data.description !== undefined)
      updateData.description = data.description;

    const updated = await prisma.nepaliHoliday.update({
      where: { id: holidayId },
      data: updateData
    });

    return NextResponse.json({ holiday: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('Update holiday error:', error);
    return NextResponse.json(
      { error: 'Failed to update holiday' },
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

    const userRole = session.user.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await props.params;
    const { holidayId } = params;

    const holiday = await prisma.nepaliHoliday.findUnique({
      where: { id: holidayId }
    });

    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }

    await prisma.nepaliHoliday.delete({
      where: { id: holidayId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete holiday error:', error);
    return NextResponse.json(
      { error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}
