import { JobStatus, type JobPriority } from '@prisma/client';

export const JOB_STATUS_OPTIONS = [
  { value: JobStatus.NOT_STARTED, label: 'Not Started' },
  { value: JobStatus.IN_PROGRESS, label: 'In Progress' },
  { value: JobStatus.IN_REVIEW, label: 'In Review' },
  { value: JobStatus.BLOCKED, label: 'Blocked' },
  { value: JobStatus.COMPLETED, label: 'Completed' }
] as const;

// Use string literals to avoid runtime enum import issues with Turbopack
export const JOB_PRIORITY_OPTIONS = [
  { value: 'LOW' as JobPriority, label: 'Low' },
  { value: 'MEDIUM' as JobPriority, label: 'Medium' },
  { value: 'HIGH' as JobPriority, label: 'High' },
  { value: 'URGENT' as JobPriority, label: 'Urgent' }
] as const;
