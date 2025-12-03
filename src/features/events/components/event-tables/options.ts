import { EventStatus } from '@prisma/client';
import { Calendar, Clock, Check, X } from 'lucide-react';

export const EVENT_STATUS_OPTIONS = [
  {
    label: 'Scheduled',
    value: EventStatus.SCHEDULED,
    icon: Calendar
  },
  {
    label: 'In Progress',
    value: EventStatus.IN_PROGRESS,
    icon: Clock
  },
  {
    label: 'Completed',
    value: EventStatus.COMPLETED,
    icon: Check
  },
  {
    label: 'Cancelled',
    value: EventStatus.CANCELLED,
    icon: X
  }
];
