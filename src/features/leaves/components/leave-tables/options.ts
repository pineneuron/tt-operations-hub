import { LeaveType, LeaveStatus } from '@prisma/client';

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const LEAVE_TYPE_OPTIONS = Object.values(LeaveType).map((type) => ({
  value: type,
  label: formatLabel(type)
}));

export const LEAVE_STATUS_OPTIONS = Object.values(LeaveStatus).map(
  (status) => ({
    value: status,
    label: formatLabel(status)
  })
);
