import nodemailer from 'nodemailer';
import { prisma } from './db';
import crypto from 'crypto';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export async function sendOtpEmail(
  email: string,
  purpose: 'login' | 'password-reset' = 'login'
) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpToken.create({
    data: {
      userId: user.id,
      token: otp,
      expires
    }
  });

  const subject =
    purpose === 'password-reset'
      ? 'Your Password Reset Code'
      : 'Your Login OTP';
  const title =
    purpose === 'password-reset' ? 'Password Reset Code' : 'Login OTP';
  const description =
    purpose === 'password-reset'
      ? 'Use this code to reset your password'
      : 'Use this code to log in to your account';

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28327b; margin-bottom: 20px;">${title}</h2>
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${description}</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #28327b; margin: 0;">${otp}</p>
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 20px;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
      </div>
    `
  });
}

export async function verifyOtp(userId: string, otp: string): Promise<boolean> {
  const token = await prisma.otpToken.findFirst({
    where: {
      userId,
      token: otp,
      used: false,
      expires: {
        gt: new Date()
      }
    }
  });

  if (!token) {
    return false;
  }

  await prisma.otpToken.update({
    where: { id: token.id },
    data: { used: true }
  });

  return true;
}

export async function sendPasswordResetEmail(email: string, userId: string) {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token: resetToken,
      expires
    }
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  });
}
