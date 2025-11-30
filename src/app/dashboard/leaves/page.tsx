import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import LeaveListingPage from '@/features/leaves/components/leave-listing';
import { LeavePageActions } from '@/features/leaves/components/leave-page-actions';
import { LeaveModal } from '@/features/leaves/components/leave-modal';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Leaves'
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
            title='Leave Requests'
            description='Manage and track leave requests.'
          />
          <LeavePageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={7} rowCount={8} filterCount={3} />
          }
        >
          <LeaveListingPage />
        </Suspense>
      </div>
      <LeaveModal />
    </PageContainer>
  );
}
