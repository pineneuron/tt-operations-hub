import { sendOtpEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await sendOtpEmail(email);

    return NextResponse.json({ success: true, message: 'OTP sent to email' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 400 }
    );
  }
}
