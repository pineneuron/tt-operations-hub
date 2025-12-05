import {
  MeetingStatus,
  MeetingType,
  MeetingParticipantRole,
  MeetingNoteType,
  MeetingMediaType,
  RecurrenceFrequency
} from '@prisma/client';

export interface MeetingListItem {
  id: string;
  title: string;
  description: string | null;
  agenda: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingLink: string | null;
  status: MeetingStatus;
  type: MeetingType;
  organizerId: string;
  organizerName: string | null;
  organizerEmail: string;
  participantCount: number;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingFormValues {
  title: string;
  description: string;
  agenda: string;
  startTime: Date;
  endTime: Date;
  location: string;
  meetingLink: string;
  status: MeetingStatus;
  type: MeetingType;
  participantIds: string[];
  isRecurring: boolean;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
    endDate: Date | null;
    occurrences: number | null;
    daysOfWeek: number[];
    dayOfMonth: number | null;
  };
  reminderMinutes: number[];
}

export interface MeetingParticipantItem {
  id: string;
  meetingId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  role: MeetingParticipantRole;
  invitedBy: string | null;
  createdAt: string;
}

export interface MeetingNoteItem {
  id: string;
  meetingId: string;
  createdById: string;
  createdByName: string | null;
  createdByEmail: string;
  createdByImage: string | null;
  type: MeetingNoteType;
  content: string;
  metadata: any;
  media: MeetingMediaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMediaItem {
  id: string;
  meetingId: string;
  noteId: string | null;
  uploadedById: string;
  uploadedByName: string | null;
  type: MeetingMediaType;
  url: string;
  description: string | null;
  size: number | null;
  createdAt: string;
}

export interface MeetingRecurrenceItem {
  id: string;
  meetingId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  endDate: string | null;
  occurrences: number | null;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingReminderItem {
  id: string;
  meetingId: string;
  userId: string;
  reminderMinutes: number[];
  createdAt: string;
}
