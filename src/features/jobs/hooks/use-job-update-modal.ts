import { create } from 'zustand';

interface JobUpdateModalState {
  isOpen: boolean;
  jobId: string | null;
  openModal: (jobId: string) => void;
  closeModal: () => void;
}

export const useJobUpdateModal = create<JobUpdateModalState>((set) => ({
  isOpen: false,
  jobId: null,
  openModal: (jobId) => set({ isOpen: true, jobId }),
  closeModal: () => set({ isOpen: false, jobId: null })
}));
