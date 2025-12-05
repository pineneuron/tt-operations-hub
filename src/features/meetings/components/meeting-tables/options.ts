import { MeetingStatus, MeetingType } from '@prisma/client';

export const MEETING_STATUS_OPTIONS = [
  { value: MeetingStatus.SCHEDULED, label: 'Scheduled' },
  { value: MeetingStatus.IN_PROGRESS, label: 'In Progress' },
  { value: MeetingStatus.COMPLETED, label: 'Completed' },
  { value: MeetingStatus.CANCELLED, label: 'Cancelled' },
  { value: MeetingStatus.POSTPONED, label: 'Postponed' }
];

export const MEETING_TYPE_OPTIONS = [
  { value: MeetingType.CLIENT_MEETING, label: 'Client Meeting' },
  { value: MeetingType.INTERNAL_MEETING, label: 'Internal Meeting' },
  { value: MeetingType.VENDOR_MEETING, label: 'Vendor Meeting' },
  { value: MeetingType.KICKOFF_MEETING, label: 'Kickoff Meeting' },
  { value: MeetingType.REVIEW_MEETING, label: 'Review Meeting' },
  { value: MeetingType.STANDUP, label: 'Standup' },
  { value: MeetingType.OTHER, label: 'Other' }
];
