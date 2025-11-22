'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/components/ui/input-otp';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset code');
      }

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired password reset code');
      }

      router.push(
        `/auth/reset-password?email=${encodeURIComponent(email)}&verified=true`
      );
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResendLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className='from-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br p-5'>
      <div className='w-full max-w-md space-y-8'>
        <div className='flex flex-col items-center space-y-2'>
          <div className='flex items-center justify-center'>
            <Image
              src='/assets/logo.png'
              alt='Logo'
              width={180}
              height={62}
              priority
            />
          </div>
        </div>

        <Card className='border-0 py-7'>
          <CardHeader className='space-y-2 pb-1 text-center'>
            <CardTitle className='text-4xl font-bold tracking-tight'>
              Forgot Password
            </CardTitle>
            <CardDescription className='text-base'>
              {step === 'email'
                ? 'Enter your email to receive a login code'
                : 'Enter the 6-digit code sent to your email'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5 px-7'>
            {step === 'email' ? (
              <form onSubmit={handleSendCode} className='space-y-5'>
                {error && (
                  <Alert variant='destructive'>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className='space-y-2'>
                  <Label
                    htmlFor='email'
                    className='text-foreground text-sm font-medium'
                  >
                    Email Address
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='Enter your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className='h-12 transition-all focus-visible:ring-2'
                    autoFocus
                  />
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full cursor-pointer text-base font-semibold shadow-md transition-all duration-200 hover:shadow-lg'
                  disabled={loading || !email}
                >
                  {loading ? 'Sending...' : 'Send Password Reset Code'}
                </Button>
                <div className='text-center'>
                  <Link
                    href='/auth/login'
                    className='text-primary inline-flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors hover:underline'
                  >
                    <ArrowLeft className='h-4 w-4' />
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className='space-y-5'>
                {error && (
                  <Alert variant='destructive'>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label className='text-foreground block text-center text-base font-medium'>
                      Enter Password Reset Code
                    </Label>
                    <div className='flex justify-center'>
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        disabled={loading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className='text-muted-foreground pt-2 text-center text-sm'>
                      Code sent to{' '}
                      <span className='text-foreground font-medium'>
                        {email}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full cursor-pointer text-base font-semibold shadow-md transition-all duration-200 hover:shadow-lg'
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>
                <div className='flex flex-col items-center space-y-3'>
                  <button
                    type='button'
                    onClick={handleResendCode}
                    disabled={resendLoading}
                    className='text-primary cursor-pointer text-sm font-medium transition-colors hover:underline disabled:opacity-50'
                  >
                    {resendLoading
                      ? 'Sending...'
                      : "Didn't receive code? Resend"}
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setStep('email');
                      setOtp('');
                      setError('');
                    }}
                    className='text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium transition-colors'
                  >
                    Change email address
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
