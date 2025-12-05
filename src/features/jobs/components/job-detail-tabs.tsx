'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { IconInfoCircle, IconHistory, IconMessage } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface JobDetailTabsProps {
  overviewContent: ReactNode;
  discussionContent: ReactNode;
  timelineContent: ReactNode;
}

export function JobDetailTabs({
  overviewContent,
  discussionContent,
  timelineContent
}: JobDetailTabsProps) {
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
        <TabsTrigger value='discussion' className='gap-2'>
          <IconMessage className='h-4 w-4' />
          Discussion
        </TabsTrigger>
        <TabsTrigger value='timeline' className='gap-2'>
          <IconHistory className='h-4 w-4' />
          Timeline
        </TabsTrigger>
      </TabsList>

      <TabsContent value='overview' className='mt-4'>
        {overviewContent}
      </TabsContent>

      <TabsContent value='discussion' className='mt-4'>
        {discussionContent}
      </TabsContent>

      <TabsContent value='timeline' className='mt-4'>
        {timelineContent}
      </TabsContent>
    </Tabs>
  );
}
