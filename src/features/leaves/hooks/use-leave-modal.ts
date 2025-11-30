import { create } from 'zustand';
import type { LeaveListItem } from '../types';

interface LeaveModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | null;
  leave: LeaveListItem | null;
  openCreate: () => void;
  openEdit: (leave: LeaveListItem) => void;
  close: () => void;
}

export const useLeaveModal = create<LeaveModalState>((set) => ({
  isOpen: false,
  mode: null,
  leave: null,
  openCreate: () => set({ isOpen: true, mode: 'create', leave: null }),
  openEdit: (leave) => set({ isOpen: true, mode: 'edit', leave }),
  close: () => set({ isOpen: false, mode: null, leave: null })
}));
