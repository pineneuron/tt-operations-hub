import { create } from 'zustand';

interface EventUpdateModalStore {
  isOpen: boolean;
  eventId: string | null;
  eventTitle: string | null;
  openModal: (eventId: string, eventTitle?: string | null) => void;
  closeModal: () => void;
}

export const useEventUpdateModal = create<EventUpdateModalStore>((set) => ({
  isOpen: false,
  eventId: null,
  eventTitle: null,
  openModal: (eventId, eventTitle) =>
    set({ isOpen: true, eventId, eventTitle: eventTitle ?? null }),
  closeModal: () => set({ isOpen: false, eventId: null, eventTitle: null })
}));
