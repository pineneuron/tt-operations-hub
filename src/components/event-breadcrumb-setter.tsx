'use client';

import { useEffect } from 'react';
import { useBreadcrumbContext } from '@/contexts/breadcrumb-context';

interface EventBreadcrumbSetterProps {
  eventTitle: string;
}

export function EventBreadcrumbSetter({
  eventTitle
}: EventBreadcrumbSetterProps) {
  const { setCustomTitle } = useBreadcrumbContext();

  useEffect(() => {
    setCustomTitle(eventTitle);
    return () => {
      setCustomTitle(null);
    };
  }, [eventTitle, setCustomTitle]);

  return null;
}
