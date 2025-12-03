import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import EventListingPage from '@/features/events/components/event-listing';
import { EventPageActions } from '@/features/events/components/event-page-actions';
import { EventModal } from '@/features/events/components/event-modal';
import { EventUpdateModal } from '@/features/events/components/event-update-modal';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Events'
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
            title='Events'
            description='Manage and track events, updates, and reports.'
          />
          <EventPageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={7} rowCount={8} filterCount={3} />
          }
        >
          <EventListingPage />
        </Suspense>
      </div>
      <EventModal />
      <EventUpdateModal />
    </PageContainer>
  );
}
