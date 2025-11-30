import { UserRole } from '@/types/user-role';

export type UserListItem = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  image: string | null;
};
