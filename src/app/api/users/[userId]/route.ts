import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

import { prisma } from '@/lib/db';

const updateUserSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.').optional(),
    email: z.string().email('Enter a valid email address.').optional(),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters.')
      .max(32, 'Username must be 32 characters or fewer.')
      .optional()
      .or(z.literal('')),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .optional()
      .or(z.literal(''))
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.username !== undefined ||
      data.role !== undefined ||
      data.isActive !== undefined ||
      (data.password !== undefined && data.password !== ''),
    {
      message: 'Provide at least one field to update.'
    }
  );

const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
  image: true
} as const;

type RouteParams = {
  params: Promise<{ userId: string }>;
};

export async function GET(_: Request, props: RouteParams) {
  try {
    const params = await props.params;
    const { userId } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[USER_GET]', error);
    return NextResponse.json(
      { message: 'Failed to fetch user.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, props: RouteParams) {
  try {
    const params = await props.params;
    const { userId } = params;

    const body = await request.json();
    const parsed = updateUserSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (parsed.email && parsed.email !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: parsed.email }
      });
      if (existingEmail) {
        return NextResponse.json(
          { message: 'Email is already registered.' },
          { status: 409 }
        );
      }
    }

    const normalizedUsername = parsed.username?.trim() ?? '';

    if (normalizedUsername && normalizedUsername !== user.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: normalizedUsername }
      });
      if (existingUsername) {
        return NextResponse.json(
          { message: 'Username is already taken.' },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};

    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.email !== undefined) data.email = parsed.email;
    if (parsed.role !== undefined) data.role = parsed.role;
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
    if (parsed.username !== undefined) {
      data.username = normalizedUsername ? normalizedUsername : null;
    }

    const trimmedPassword = parsed.password?.trim() ?? '';

    if (trimmedPassword.length > 0) {
      data.passwordHash = await bcrypt.hash(trimmedPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[USER_PATCH]', error);
    return NextResponse.json(
      { message: 'Failed to update user.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, props: RouteParams) {
  try {
    const params = await props.params;
    const { userId } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ message: 'User deleted.' }, { status: 200 });
  } catch (error) {
    console.error('[USER_DELETE]', error);
    return NextResponse.json(
      { message: 'Failed to delete user.' },
      { status: 500 }
    );
  }
}
