import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';

export const metadata = {
  title: 'Dashboard: Transportation Booking'
};

type pageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function TransportationBookingDetailPage(
  props: pageProps
) {
  const { bookingId } = await props.params;

  return (
    <PageContainer scrollable={false}>
      <div className='flex flex-1 flex-col space-y-4'>
        <Heading
          title='Transportation Booking'
          description='View and manage transportation booking details'
        />
        <div className='py-4'>
          <p className='text-muted-foreground text-sm'>
            Booking detail page will be implemented here. Booking ID:{' '}
            {bookingId}
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
