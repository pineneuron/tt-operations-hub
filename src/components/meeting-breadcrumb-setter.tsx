'use client';

import { useEffect } from 'react';
import { useBreadcrumbContext } from '@/contexts/breadcrumb-context';

interface MeetingBreadcrumbSetterProps {
  title: string;
}

export function MeetingBreadcrumbSetter({
  title
}: MeetingBreadcrumbSetterProps) {
  const { setCustomTitle } = useBreadcrumbContext();

  useEffect(() => {
    setCustomTitle(title);
    return () => {
      setCustomTitle(null);
    };
  }, [title, setCustomTitle]);

  return null;
}
