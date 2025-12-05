'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import {
  IconInfoCircle,
  IconHistory,
  IconReport,
  IconPhoto
} from '@tabler/icons-react';
import { ReactNode } from 'react';

interface EventDetailTabsProps {
  overviewContent: ReactNode;
  updatesContent: ReactNode;
  reportsContent: ReactNode;
  mediaContent: ReactNode;
}

export function EventDetailTabs({
  overviewContent,
  updatesContent,
  reportsContent,
  mediaContent
}: EventDetailTabsProps) {
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsString.withDefault('overview')
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className='flex-1'>
      <TabsList>
        <TabsTrigger value='overview' className='gap-2'>
          <IconInfoCircle className='h-4 w-4' />
          Overview
        </TabsTrigger>
        <TabsTrigger value='updates' className='gap-2'>
          <IconHistory className='h-4 w-4' />
          Timeline
        </TabsTrigger>
        <TabsTrigger value='reports' className='gap-2'>
          <IconReport className='h-4 w-4' />
          Reports
        </TabsTrigger>
        <TabsTrigger value='media' className='gap-2'>
          <IconPhoto className='h-4 w-4' />
          Media Gallery
        </TabsTrigger>
      </TabsList>

      <TabsContent value='overview' className='mt-4'>
        {overviewContent}
      </TabsContent>

      <TabsContent value='updates' className='mt-4'>
        {updatesContent}
      </TabsContent>

      <TabsContent value='reports' className='mt-4'>
        {reportsContent}
      </TabsContent>

      <TabsContent value='media' className='mt-4'>
        {mediaContent}
      </TabsContent>
    </Tabs>
  );
}
