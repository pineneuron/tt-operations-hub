import { requireAuth } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await requireAuth();
  redirect('/dashboard/overview');
}
