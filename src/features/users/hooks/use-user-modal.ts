import { create } from 'zustand';
import type { UserListItem } from '@/features/users/types';

type UserModalMode = 'create' | 'edit';

interface UserModalState {
  isOpen: boolean;
  mode: UserModalMode;
  user: UserListItem | null;
  openCreate: () => void;
  openEdit: (user: UserListItem) => void;
  close: () => void;
}

export const useUserModal = create<UserModalState>((set) => ({
  isOpen: false,
  mode: 'create',
  user: null,
  openCreate: () =>
    set({
      isOpen: true,
      mode: 'create',
      user: null
    }),
  openEdit: (user) =>
    set({
      isOpen: true,
      mode: 'edit',
      user
    }),
  close: () =>
    set({
      isOpen: false,
      user: null
    })
}));
