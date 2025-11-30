import { WorkLocation, AttendanceStatus, AttendanceFlag } from '@prisma/client';

export interface AttendanceHistoryItem {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  date: string;
  workLocation: WorkLocation;
  status: AttendanceStatus;
  flags: AttendanceFlag[];
  checkInTime: string;
  expectedCheckInTime: string | null;
  checkOutTime: string | null;
  totalHours: number | null;
  isLate: boolean;
  lateMinutes: number | null;
  lateReason: string | null;
  checkInLocationAddress: string | null;
  checkOutLocationAddress: string | null;
  checkInNotes: string | null;
  checkOutNotes: string | null;
  autoCheckedOut: boolean;
  createdAt: string;
}
