import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const jobData = [
  {
    title: 'Main stage lighting rig',
    assignedTo: 'Staff • Events',
    due: 'Due today',
    status: 'In progress'
  },
  {
    title: 'Vendor contract (Audio Visual Nepal)',
    assignedTo: 'Admin • Vendor/Supplier',
    due: 'Due tomorrow',
    status: 'Waiting approval'
  },
  {
    title: 'Client walk-through - Masta Foods',
    assignedTo: 'Meeting • Client',
    due: 'Thu, 2:00 PM',
    status: 'Confirmed'
  },
  {
    title: 'Transport manifest for Expo',
    assignedTo: 'Transportation • Staff',
    due: 'Fri, 9:00 AM',
    status: 'Dispatch ready'
  },
  {
    title: 'Finance clearance - Vendor payouts',
    assignedTo: 'Finance • Platform Admin',
    due: 'Fri, 6:00 PM',
    status: 'Action required'
  }
];

export function RecentSales() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Job & Task Queue</CardTitle>
        <CardDescription>
          Admin can push tasks to Staff and Vendors. Updates notify everyone.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {jobData.map((job) => (
          <div key={job.title} className='rounded-lg border p-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm leading-tight font-semibold'>{job.title}</p>
              <Badge variant='secondary' className='text-xs'>
                {job.status}
              </Badge>
            </div>
            <p className='text-muted-foreground mt-2 text-xs'>
              {job.assignedTo}
            </p>
            <p className='mt-1 text-sm font-medium'>{job.due}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
