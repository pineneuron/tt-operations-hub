'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type BreadcrumbContextType = {
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
};

export const BreadcrumbContext = createContext<
  BreadcrumbContextType | undefined
>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ customTitle, setCustomTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error(
      'useBreadcrumbContext must be used within BreadcrumbProvider'
    );
  }
  return context;
}
