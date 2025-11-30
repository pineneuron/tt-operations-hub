import { create } from 'zustand';

interface HolidayModalState {
  isOpen: boolean;
  holidayId: string | null;
  openCreate: () => void;
  openEdit: (id: string) => void;
  close: () => void;
}

export const useHolidayModal = create<HolidayModalState>((set) => ({
  isOpen: false,
  holidayId: null,
  openCreate: () => set({ isOpen: true, holidayId: null }),
  openEdit: (id: string) => set({ isOpen: true, holidayId: id }),
  close: () => set({ isOpen: false, holidayId: null })
}));
