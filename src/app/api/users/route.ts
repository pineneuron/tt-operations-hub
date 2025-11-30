import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

import { prisma } from '@/lib/db';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Enter a valid email address.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(32, 'Username must be 32 characters or fewer.')
    .optional()
    .or(z.literal('')),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional().default(true),
  password: z.string().min(8, 'Password must be at least 8 characters.')
});

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, username, role, isActive, password } =
      createUserSchema.parse(body);
    const normalizedUsername = username?.trim();

    const [emailExists, usernameExists] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      normalizedUsername
        ? prisma.user.findUnique({
            where: { username: normalizedUsername }
          })
        : Promise.resolve(null)
    ]);

    if (emailExists) {
      return NextResponse.json(
        { message: 'Email is already registered.' },
        { status: 409 }
      );
    }

    if (usernameExists) {
      return NextResponse.json(
        { message: 'Username is already taken.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username: normalizedUsername || null,
        role,
        isActive,
        passwordHash
      },
      select: userSelect
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request payload.', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('[USERS_POST]', error);
    return NextResponse.json(
      { message: 'Failed to create user.' },
      { status: 500 }
    );
  }
}
