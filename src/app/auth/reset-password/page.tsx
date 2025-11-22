'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const email = searchParams.get('email');
  const verified = searchParams.get('verified') === 'true';

  useEffect(() => {
    if (!email || !verified) {
      router.push('/auth/forgot-password');
    }
  }, [email, verified, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !verified) {
    return null;
  }

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
              Reset Password
            </CardTitle>
            <CardDescription className='text-base'>
              {success
                ? 'Password reset successfully. Redirecting to login...'
                : 'Enter your new password'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5 px-7'>
            {success ? (
              <Alert>
                <AlertDescription>
                  Password reset successfully. Redirecting to login...
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-5'>
                {error && (
                  <Alert variant='destructive'>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className='space-y-2'>
                  <Label
                    htmlFor='password'
                    className='text-foreground text-sm font-medium'
                  >
                    New Password
                  </Label>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Enter new password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className='h-12 pr-10 transition-all focus-visible:ring-2'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors'
                    >
                      {showPassword ? (
                        <EyeOff className='h-5 w-5' />
                      ) : (
                        <Eye className='h-5 w-5' />
                      )}
                    </button>
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='confirmPassword'
                    className='text-foreground text-sm font-medium'
                  >
                    Confirm Password
                  </Label>
                  <div className='relative'>
                    <Input
                      id='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder='Confirm new password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className='h-12 pr-10 transition-all focus-visible:ring-2'
                    />
                    <button
                      type='button'
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors'
                    >
                      {showConfirmPassword ? (
                        <EyeOff className='h-5 w-5' />
                      ) : (
                        <Eye className='h-5 w-5' />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full cursor-pointer text-base font-semibold shadow-md transition-all duration-200 hover:shadow-lg'
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
