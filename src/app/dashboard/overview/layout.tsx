import React from 'react';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IconBell } from '@tabler/icons-react';

const summaryStats = [
  {
    title: 'Attendance compliance',
    value: '98%',
    delta: '+2.3% vs last week',
    note: 'Staff check-ins across all hubs'
  },
  {
    title: 'Upcoming events',
    value: '12',
    delta: '4 new briefs',
    note: 'On-site + virtual'
  },
  {
    title: 'Meetings today',
    value: '7',
    delta: '3 client, 4 internal',
    note: 'Auto synced from calendar'
  }
];

const notifications = [
  {
    title: 'Admin scheduled a kickoff with Mero Bank',
    detail: 'Meeting for AV requirements assigned to Client + Staff',
    time: '2m ago',
    read: false
  },
  {
    title: 'New transportation booking',
    detail: 'Staff requested 3-ton truck for Expo load-out',
    time: '15m ago',
    read: false
  },
  {
    title: 'Vendor contract updated',
    detail: 'Lighting vendor approved revised scope',
    time: '32m ago',
    read: true
  },
  {
    title: 'Task assigned: Stage layout QA',
    detail: 'Admin assigned to Events team with due date today',
    time: '1h ago',
    read: true
  },
  {
    title: 'Finance reminder',
    detail: 'Supplier invoices ready for review',
    time: '3h ago',
    read: true
  }
];

export default function OverViewLayout() {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-8'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-muted-foreground text-sm'>
              Operations Control • All roles
            </p>
            <h2 className='text-2xl font-bold tracking-tight'>
              Welcome to Tech Trust
            </h2>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline'>View calendar</Button>
            <Button>Create record</Button>
          </div>
        </div>

        <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
          <Card className='order-2 lg:order-1'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2'>
                <IconBell className='text-primary h-4 w-4' />
                Recent notifications
              </CardTitle>
              <Badge variant='outline'>Last 5 updates</Badge>
            </CardHeader>
            <CardContent className='space-y-3'>
              {notifications.map((item) => (
                <button
                  key={item.title}
                  className='hover:border-primary flex w-full flex-col gap-1 rounded-lg border p-3 text-left text-sm transition'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-start gap-2'>
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          item.read ? 'bg-muted' : 'bg-primary'
                        }`}
                        aria-hidden
                      />
                      <div>
                        <p className='font-medium'>{item.title}</p>
                        <p className='text-muted-foreground text-xs'>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                    <span className='text-muted-foreground text-[11px] whitespace-nowrap'>
                      {item.time}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
            <div className='border-t px-3 pt-3'>
              <Button variant='ghost' className='w-full text-sm'>
                See all notifications
              </Button>
            </div>
          </Card>
          <div className='order-1 space-y-4 lg:order-2'>
            {summaryStats.map((stat) => (
              <Card key={`${stat.title}-sidebar`} className='p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-xs tracking-wide uppercase'>
                      {stat.title}
                    </p>
                    <p className='pt-2 text-3xl font-semibold'>{stat.value}</p>
                  </div>
                  <Badge variant='secondary'>{stat.delta}</Badge>
                </div>
                <p className='text-muted-foreground mt-3 text-sm'>
                  {stat.note}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
