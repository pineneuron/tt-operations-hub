'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>(
    'password'
  );
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error('Invalid email or password');
      }

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      const callbackUrl =
        searchParams.get('callbackUrl') || '/dashboard/overview';
      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        otp,
        redirect: false
      });

      if (result?.error) {
        throw new Error('Invalid OTP');
      }

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      const callbackUrl =
        searchParams.get('callbackUrl') || '/dashboard/overview';
      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
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
              Login
            </CardTitle>
            <CardDescription className='text-base'>
              {loginMethod === 'password'
                ? 'Enter your credentials to continue'
                : 'Enter your email to receive an OTP'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5 px-7'>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loginMethod === 'password' ? (
              <form onSubmit={handlePasswordLogin} className='space-y-5'>
                <div className='space-y-2'>
                  <Label
                    htmlFor='email'
                    className='text-foreground text-sm font-medium'
                  >
                    Email Address
                  </Label>
                  <Input
                    id='email'
                    type='text'
                    placeholder='Enter your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className='h-12 transition-all focus-visible:ring-2'
                  />
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='password'
                    className='text-foreground text-sm font-medium'
                  >
                    Password
                  </Label>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Enter your password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className='h-12 pr-10 transition-all focus-visible:ring-2'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors focus:outline-none'
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className='h-5 w-5' />
                      ) : (
                        <Eye className='h-5 w-5' />
                      )}
                    </button>
                  </div>
                </div>
                <div className='flex items-center justify-between pt-1'>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='remember'
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked === true)
                      }
                    />
                    <Label
                      htmlFor='remember'
                      className='text-muted-foreground cursor-pointer text-sm font-normal select-none'
                    >
                      Remember Me
                    </Label>
                  </div>
                  <Link
                    href='/auth/forgot-password'
                    className='text-primary text-sm font-medium transition-colors hover:underline'
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full cursor-pointer text-base font-semibold shadow-md transition-all duration-200 hover:shadow-lg'
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-card text-muted-foreground px-2'>
                      Or
                    </span>
                  </div>
                </div>
                <div className='text-center'>
                  <button
                    type='button'
                    onClick={() => {
                      setLoginMethod('otp');
                      setError('');
                      setPassword('');
                    }}
                    className='text-primary cursor-pointer text-sm font-medium transition-colors hover:underline'
                  >
                    Login with OTP instead
                  </button>
                </div>
              </form>
            ) : step === 'email' ? (
              <form onSubmit={handleSendOtp} className='space-y-5'>
                <div className='space-y-2'>
                  <Label
                    htmlFor='email'
                    className='text-foreground text-sm font-medium'
                  >
                    Email Address
                  </Label>
                  <Input
                    id='email'
                    type='text'
                    placeholder='Enter your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className='h-12 transition-all focus-visible:ring-2'
                  />
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full text-base font-semibold shadow-md transition-all duration-200 hover:shadow-lg'
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-card text-muted-foreground px-2'>
                      Or
                    </span>
                  </div>
                </div>
                <div className='text-center'>
                  <button
                    type='button'
                    onClick={() => {
                      setLoginMethod('password');
                      setError('');
                      setOtp('');
                      setStep('email');
                    }}
                    className='text-primary cursor-pointer text-sm font-medium transition-colors hover:underline'
                  >
                    Login with password instead
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className='space-y-5'>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label className='text-foreground block text-center text-base font-medium'>
                      Enter OTP
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
                      OTP sent to{' '}
                      <span className='text-foreground font-medium'>
                        {email}
                      </span>
                    </p>
                  </div>
                </div>
                <div className='flex items-center space-x-2 pt-1'>
                  <Checkbox
                    id='remember'
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                  />
                  <Label
                    htmlFor='remember'
                    className='text-muted-foreground cursor-pointer text-sm font-normal select-none'
                  >
                    Remember Me
                  </Label>
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full text-base font-semibold shadow-md transition-all duration-200 hover:shadow-lg'
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-11 w-full'
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  Change email
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
