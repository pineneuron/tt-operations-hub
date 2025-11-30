import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user-role';

const createHolidaySchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  date: z.string().datetime(),
  year: z.number().int().min(2020).max(2100),
  isRecurring: z.boolean().default(false),
  description: z.string().optional().nullable()
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only ADMIN and PLATFORM_ADMIN can view holidays
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const year = searchParams.get('year');
    const category = searchParams.get('category');

    const where: any = {};
    if (year) {
      where.year = parseInt(year);
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const [holidays, total] = await Promise.all([
      prisma.nepaliHoliday.findMany({
        where,
        orderBy: { date: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.nepaliHoliday.count({ where })
    ]);

    return NextResponse.json({
      holidays,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Only ADMIN and PLATFORM_ADMIN can create holidays
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = createHolidaySchema.parse(body);

    // Check if holiday already exists for this category, date, and year
    const dateObj = new Date(data.date);
    // Set time to midnight to match date-only comparison
    dateObj.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.nepaliHoliday.findFirst({
      where: {
        category: data.category,
        date: dateObj,
        year: data.year
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Holiday already exists for this category, date, and year.' },
        { status: 409 }
      );
    }

    const holiday = await prisma.nepaliHoliday.create({
      data: {
        category: data.category,
        date: dateObj,
        year: data.year,
        isRecurring: data.isRecurring,
        description: data.description
      }
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('Create holiday error:', error);
    return NextResponse.json(
      { error: 'Failed to create holiday' },
      { status: 500 }
    );
  }
}
