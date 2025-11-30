import { LeaveType, LeaveStatus, HalfDayType } from '@prisma/client';

export type LeaveListItem = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayType: HalfDayType | null;
  reason: string;
  notes: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  totalDays: number;
  createdAt: string;
  updatedAt: string;
};
