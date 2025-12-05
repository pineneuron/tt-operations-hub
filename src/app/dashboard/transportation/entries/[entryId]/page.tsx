import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';

export const metadata = {
  title: 'Dashboard: Transportation Entry'
};

type pageProps = {
  params: Promise<{
    entryId: string;
  }>;
};

export default async function TransportationEntryDetailPage(props: pageProps) {
  const { entryId } = await props.params;

  return (
    <PageContainer scrollable={false}>
      <div className='flex flex-1 flex-col space-y-4'>
        <Heading
          title='Transportation Entry'
          description='View and manage transportation entry details'
        />
        <div className='py-4'>
          <p className='text-muted-foreground text-sm'>
            Entry detail page will be implemented here. Entry ID: {entryId}
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
