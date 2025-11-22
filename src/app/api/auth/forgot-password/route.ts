import { sendOtpEmail } from '@/lib/email';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a login code has been sent'
      });
    }

    await sendOtpEmail(email, 'password-reset');

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a login code has been sent'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send login code' },
      { status: 500 }
    );
  }
}
