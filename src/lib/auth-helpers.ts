import { auth } from './auth';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}

export function hasPermission(userRole: string, permission: string): boolean {
  if (userRole === 'PLATFORM_ADMIN') {
    return true;
  }

  return false;
}
