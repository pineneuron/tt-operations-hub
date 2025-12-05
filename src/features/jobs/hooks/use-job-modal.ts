import { create } from 'zustand';
import type { JobListItem } from '../types';

interface JobModalState {
  isOpen: boolean;
  job: JobListItem | null;
  openModal: (job?: JobListItem | null) => void;
  closeModal: () => void;
}

export const useJobModal = create<JobModalState>((set) => ({
  isOpen: false,
  job: null,
  openModal: (job = null) => set({ isOpen: true, job }),
  closeModal: () => set({ isOpen: false, job: null })
}));
