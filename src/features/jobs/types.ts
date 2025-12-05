import {
  JobStatus,
  JobPriority,
  JobUpdateType,
  JobMediaType
} from '@prisma/client';

export interface JobListItem {
  id: string;
  title: string;
  remarks: string | null;
  status: JobStatus;
  priority: JobPriority | null;
  dueDate: string | null;
  completedAt: string | null;
  eventId: string | null;
  eventTitle: string | null;
  assigneeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobFormValues {
  title: string;
  remarks: string;
  status: JobStatus;
  priority: JobPriority | null;
  dueDate: Date | null;
  eventId: string | null;
  staffIds: string[];
  files?: File[];
}

export interface JobAssigneeItem {
  id: string;
  jobId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  role: string | null;
  assignedAt: string;
}

export interface JobUpdateItem {
  id: string;
  jobId: string;
  createdById: string;
  createdByName: string | null;
  createdByEmail: string;
  createdByImage: string | null;
  type: JobUpdateType;
  status: JobStatus | null;
  message: string;
  metadata: any;
  media: JobMediaItem[];
  createdAt: string;
}

export interface JobMediaItem {
  id: string;
  jobId: string;
  updateId: string | null;
  uploadedById: string;
  uploadedByName: string | null;
  type: JobMediaType;
  url: string;
  description: string | null;
  size: number | null;
  createdAt: string;
}
