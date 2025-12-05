'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import { IconInfoCircle, IconHistory, IconNotes } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface MeetingDetailTabsProps {
  overviewContent: ReactNode;
  notesContent: ReactNode;
  timelineContent: ReactNode;
}

export function MeetingDetailTabs({
  overviewContent,
  notesContent,
  timelineContent
}: MeetingDetailTabsProps) {
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
        <TabsTrigger value='notes' className='gap-2'>
          <IconNotes className='h-4 w-4' />
          Notes
        </TabsTrigger>
        <TabsTrigger value='timeline' className='gap-2'>
          <IconHistory className='h-4 w-4' />
          Timeline
        </TabsTrigger>
      </TabsList>

      <TabsContent value='overview' className='mt-4'>
        {overviewContent}
      </TabsContent>

      <TabsContent value='notes' className='mt-4'>
        {notesContent}
      </TabsContent>

      <TabsContent value='timeline' className='mt-4'>
        {timelineContent}
      </TabsContent>
    </Tabs>
  );
}
