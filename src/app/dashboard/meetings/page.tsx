import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import MeetingListingPage from '@/features/meetings/components/meeting-listing';
import { MeetingPageActions } from '@/features/meetings/components/meeting-page-actions';
import { MeetingModal } from '@/features/meetings/components/meeting-modal';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Meetings'
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
            title='Meetings'
            description='Schedule and manage meetings, track notes and minutes.'
          />
          <MeetingPageActions />
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={7} rowCount={8} filterCount={3} />
          }
        >
          <MeetingListingPage />
        </Suspense>
      </div>
      <MeetingModal />
    </PageContainer>
  );
}
