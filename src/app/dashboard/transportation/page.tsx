import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import TransportationListingPage from '@/features/transportation/components/transportation-listing';
import { TransportationPageActions } from '@/features/transportation/components/transportation-page-actions';
import { TransportationBookingModal } from '@/features/transportation/components/transportation-booking-modal';
import { TransportationEntryModal } from '@/features/transportation/components/transportation-entry-modal';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Transportation'
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer scrollable={false}>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Transportation'
            description='Manage transportation bookings and track vehicle entries.'
          />
          <TransportationPageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={6} rowCount={8} filterCount={3} />
          }
        >
          <TransportationListingPage />
        </Suspense>
      </div>
      <TransportationBookingModal />
      <TransportationEntryModal />
    </PageContainer>
  );
}
