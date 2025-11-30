import type { Option } from '@/types/data-table';
import { WorkLocation, AttendanceStatus } from '@prisma/client';

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const WORK_LOCATION_OPTIONS: Option[] = Object.values(WorkLocation).map(
  (location) => ({
    value: location,
    label: formatLabel(location)
  })
);

export const ATTENDANCE_STATUS_OPTIONS: Option[] = Object.values(
  AttendanceStatus
).map((status) => ({
  value: status,
  label: formatLabel(status)
}));
