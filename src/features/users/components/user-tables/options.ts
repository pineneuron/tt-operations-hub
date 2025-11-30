import { UserRole } from '@/types/user-role';

const formatLabel = (role: string) =>
  role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const ROLE_OPTIONS = Object.values(UserRole).map((role) => ({
  value: role,
  label: formatLabel(role)
}));
