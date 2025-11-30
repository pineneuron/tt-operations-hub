import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import AttendanceListingPage from '@/features/attendance/components/attendance-listing';
import { AttendancePageActions } from '@/features/attendance/components/attendance-page-actions';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Attendance History'
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer scrollable={false}>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Attendance History'
            description='View your attendance history including check-in/check-out times, total hours, and locations. Admins can view, filter, and export all staff attendance records.'
          />
          <AttendancePageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={8} rowCount={10} filterCount={3} />
          }
        >
          <AttendanceListingPage />
        </Suspense>
      </div>
    </PageContainer>
  );
}
