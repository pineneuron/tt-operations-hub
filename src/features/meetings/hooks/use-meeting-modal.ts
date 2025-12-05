'use client';

import { create } from 'zustand';

interface MeetingModalStore {
  isOpen: boolean;
  meetingId: string | null;
  openModal: (meetingId?: string) => void;
  closeModal: () => void;
}

export const useMeetingModal = create<MeetingModalStore>((set) => ({
  isOpen: false,
  meetingId: null,
  openModal: (meetingId) => set({ isOpen: true, meetingId: meetingId || null }),
  closeModal: () => set({ isOpen: false, meetingId: null })
}));
