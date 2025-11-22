import { requireAuth } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  await requireAuth();
  redirect('/dashboard/overview');
}
