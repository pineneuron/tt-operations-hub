import { create } from 'zustand';

interface EventModalStore {
  isOpen: boolean;
  eventId: string | null;
  openModal: (eventId?: string) => void;
  closeModal: () => void;
}

export const useEventModal = create<EventModalStore>((set) => ({
  isOpen: false,
  eventId: null,
  openModal: (eventId) => set({ isOpen: true, eventId: eventId || null }),
  closeModal: () => set({ isOpen: false, eventId: null })
}));
