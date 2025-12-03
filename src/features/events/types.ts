import {
  EventStatus,
  EventParticipantRole,
  EventUpdateType,
  EventMediaType
} from '@prisma/client';

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  featuredImageUrl: string | null;
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  venue: string | null;
  startDate: string;
  endDate: string;
  status: EventStatus;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventFormValues {
  title: string;
  description: string;
  clientId: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
}

export interface EventParticipantItem {
  id: string;
  eventId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  role: EventParticipantRole;
  invitedBy: string | null;
  createdAt: string;
}

export interface EventUpdateItem {
  id: string;
  eventId: string;
  createdById: string;
  createdByName: string | null;
  createdByEmail: string;
  type: EventUpdateType;
  status: EventStatus | null;
  message: string;
  metadata: any;
  media: EventMediaItem[];
  createdAt: string;
}

export interface EventMediaItem {
  id: string;
  eventId: string;
  updateId: string | null;
  reportId: string | null;
  uploadedById: string;
  uploadedByName: string | null;
  type: EventMediaType;
  url: string;
  description: string | null;
  createdAt: string;
}

export interface EventReportItem {
  id: string;
  eventId: string;
  submittedById: string;
  submittedByName: string | null;
  summary: string;
  issues: string | null;
  notes: string | null;
  attachments: EventMediaItem[];
  createdAt: string;
}
