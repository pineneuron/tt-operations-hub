import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import HolidayListingPage from '@/features/holidays/components/holiday-listing';
import { HolidayPageActions } from '@/features/holidays/components/holiday-page-actions';
import { HolidayModal } from '@/features/holidays/components/holiday-modal';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Public Holidays'
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
            title='Public Holidays'
            description='Manage public holidays for the current year. Add holidays by category and date.'
          />
          <HolidayPageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={6} rowCount={8} filterCount={3} />
          }
        >
          <HolidayListingPage />
        </Suspense>
      </div>
      <HolidayModal />
    </PageContainer>
  );
}
