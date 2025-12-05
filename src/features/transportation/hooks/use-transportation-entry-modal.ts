'use client';

import { create } from 'zustand';

interface TransportationEntryModalStore {
  isOpen: boolean;
  entryId: string | null;
  openModal: (entryId?: string) => void;
  closeModal: () => void;
}

export const useTransportationEntryModal =
  create<TransportationEntryModalStore>((set) => ({
    isOpen: false,
    entryId: null,
    openModal: (entryId) => set({ isOpen: true, entryId: entryId || null }),
    closeModal: () => set({ isOpen: false, entryId: null })
  }));
