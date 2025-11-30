import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, deviceId, userAgent } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    // Check if token already exists for this user
    const existingToken = await prisma.fcmToken.findUnique({
      where: { token }
    });

    if (existingToken) {
      // Update if it belongs to a different user or update metadata
      if (existingToken.userId !== session.user.id) {
        // Token is being reused by another user, update it
        await prisma.fcmToken.update({
          where: { token },
          data: {
            userId: session.user.id,
            deviceId: deviceId || null,
            userAgent: userAgent || null,
            updatedAt: new Date()
          }
        });
      } else {
        // Same user, just update metadata
        await prisma.fcmToken.update({
          where: { token },
          data: {
            deviceId: deviceId || null,
            userAgent: userAgent || null,
            updatedAt: new Date()
          }
        });
      }
    } else {
      // Create new token
      await prisma.fcmToken.create({
        data: {
          userId: session.user.id,
          token,
          deviceId: deviceId || null,
          userAgent: userAgent || null
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to save FCM token' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    // Delete token if it belongs to this user
    await prisma.fcmToken.deleteMany({
      where: {
        token,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to delete FCM token' },
      { status: 500 }
    );
  }
}
