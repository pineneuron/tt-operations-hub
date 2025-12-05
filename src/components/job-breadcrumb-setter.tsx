'use client';

import { useEffect } from 'react';
import { useBreadcrumbContext } from '@/contexts/breadcrumb-context';

interface JobBreadcrumbSetterProps {
  title: string;
}

export function JobBreadcrumbSetter({ title }: JobBreadcrumbSetterProps) {
  const { setCustomTitle } = useBreadcrumbContext();

  useEffect(() => {
    setCustomTitle(title);
    return () => {
      setCustomTitle(null);
    };
  }, [title, setCustomTitle]);

  return null;
}
