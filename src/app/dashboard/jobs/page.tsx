import PageContainer from '@/components/layout/page-container';
import JobListingPage from '@/features/jobs/components/job-listing';
import { JobPageActions } from '@/features/jobs/components/job-page-actions';
import { JobModal } from '@/features/jobs/components/job-modal';
import { JobUpdateModal } from '@/features/jobs/components/job-update-modal';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Dashboard: Jobs'
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function JobsPage(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer scrollable={false}>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Jobs'
            description='Manage and track jobs, tasks, and assignments.'
          />
          <JobPageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={5} rowCount={8} filterCount={2} />
          }
        >
          <JobListingPage />
        </Suspense>
      </div>
      <JobModal />
      <JobUpdateModal />
    </PageContainer>
  );
}
