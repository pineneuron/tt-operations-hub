'use client';

import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { UserAvatarProfile } from '@/components/user-avatar-profile';

export default function ProfileViewPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <div className='flex w-full flex-col space-y-4 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-4'>
            <UserAvatarProfile user={user} showInfo />
          </div>
          <div className='space-y-2'>
            <div>
              <label className='text-sm font-medium'>Name</label>
              <p className='text-muted-foreground text-sm'>
                {user.name || 'Not set'}
              </p>
            </div>
            <div>
              <label className='text-sm font-medium'>Email</label>
              <p className='text-muted-foreground text-sm'>{user.email}</p>
            </div>
            <div>
              <label className='text-sm font-medium'>Role</label>
              <p className='text-muted-foreground text-sm'>
                {(user as any).role || 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
