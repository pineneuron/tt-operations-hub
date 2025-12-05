'use client';

import { create } from 'zustand';

interface TransportationBookingModalStore {
  isOpen: boolean;
  bookingId: string | null;
  openModal: (bookingId?: string) => void;
  closeModal: () => void;
}

export const useTransportationBookingModal =
  create<TransportationBookingModalStore>((set) => ({
    isOpen: false,
    bookingId: null,
    openModal: (bookingId) =>
      set({ isOpen: true, bookingId: bookingId || null }),
    closeModal: () => set({ isOpen: false, bookingId: null })
  }));
