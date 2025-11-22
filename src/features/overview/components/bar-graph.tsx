'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

export const description = 'Attendance compliance trend';

const chartData = [
  { day: 'Mon', onsite: 48, remote: 6 },
  { day: 'Tue', onsite: 52, remote: 4 },
  { day: 'Wed', onsite: 51, remote: 7 },
  { day: 'Thu', onsite: 54, remote: 5 },
  { day: 'Fri', onsite: 46, remote: 9 },
  { day: 'Sat', onsite: 38, remote: 3 },
  { day: 'Sun', onsite: 27, remote: 2 }
];

const chartConfig = {
  attendance: {
    label: 'Attendance'
  },
  onsite: {
    label: 'On-site Check-ins',
    color: 'var(--primary)'
  },
  remote: {
    label: 'Remote / Approved',
    color: 'var(--primary)'
  }
} satisfies ChartConfig;

export function BarGraph() {
  const total = React.useMemo(
    () => ({
      onsite: chartData.reduce((acc, curr) => acc + curr.onsite, 0),
      remote: chartData.reduce((acc, curr) => acc + curr.remote, 0)
    }),
    []
  );

  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <Card className='@container/card !pt-3'>
      <CardHeader className='flex flex-col gap-1 px-6 !py-0'>
        <CardTitle>Attendance Compliance</CardTitle>
        <CardDescription>
          Live check-in vs approved remote activity this week
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='aspect-auto h-[250px] w-full'
        >
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <defs>
              <linearGradient id='fillOnsite' x1='0' y1='0' x2='0' y2='1'>
                <stop
                  offset='0%'
                  stopColor='var(--primary)'
                  stopOpacity={0.9}
                />
                <stop
                  offset='100%'
                  stopColor='var(--primary)'
                  stopOpacity={0.2}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='day'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--primary)', opacity: 0.08 }}
              content={
                <ChartTooltipContent
                  className='w-[150px]'
                  nameKey='attendance'
                />
              }
            />
            <Bar
              dataKey='onsite'
              fill='url(#fillOnsite)'
              radius={[4, 4, 0, 0]}
            />
            <Bar dataKey='remote' fill='var(--primary)' radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardContent className='grid grid-cols-2 gap-3 border-t px-6 py-4 text-sm'>
        <div>
          <p className='text-muted-foreground'>On-site entries</p>
          <p className='text-lg font-semibold'>
            {total.onsite.toLocaleString()} staff
          </p>
        </div>
        <div>
          <p className='text-muted-foreground'>Remote / OTP approved</p>
          <p className='text-lg font-semibold'>
            {total.remote.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
