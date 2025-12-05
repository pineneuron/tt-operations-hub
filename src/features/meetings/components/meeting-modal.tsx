'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FormInput } from '@/components/forms/form-input';
import { FormTextarea } from '@/components/forms/form-textarea';
import { FormDatePicker } from '@/components/forms/form-date-picker';
import { FormTimePicker } from '@/components/forms/form-time-picker';
import { FormSelect } from '@/components/forms/form-select';
import { FormMultiAutocomplete } from '@/components/forms/form-multi-autocomplete';
import { FormFileUpload } from '@/components/forms/form-file-upload';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Paperclip, ChevronDown } from 'lucide-react';
import { useMeetingModal } from '@/features/meetings/hooks/use-meeting-modal';
import {
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_OPTIONS
} from '@/features/meetings/components/meeting-tables/options';
import { Separator } from '@/components/ui/separator';

const RECURRENCE_FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' }
];

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' }
];

const DAYS_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];
const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];
const ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES
];

const meetingFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    agenda: z.string().optional().or(z.literal('')),
    startDate: z.date(),
    startTime: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endDate: z.date(),
    endTime: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    attachments: z
      .any()
      .optional()
      .refine(
        (files) =>
          !files ||
          files.length === 0 ||
          (Array.isArray(files) &&
            files.every(
              (file: any) =>
                file instanceof File &&
                file.size <= MAX_FILE_SIZE &&
                ACCEPTED_FILE_TYPES.includes(file.type)
            )),
        'Files must be images (JPEG, PNG, WebP) or documents (PDF, DOC, DOCX) and up to 5MB each.'
      ),
    location: z.string().optional().or(z.literal('')),
    meetingLink: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => !val || val === '' || z.string().url().safeParse(val).success,
        'Must be a valid URL'
      ),
    status: z
      .enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'])
      .default('SCHEDULED'),
    type: z
      .enum([
        'CLIENT_MEETING',
        'INTERNAL_MEETING',
        'VENDOR_MEETING',
        'KICKOFF_MEETING',
        'REVIEW_MEETING',
        'STANDUP',
        'OTHER'
      ])
      .default('INTERNAL_MEETING'),
    participantIds: z.array(z.string()).optional().default([]),
    isRecurring: z.boolean().default(false),
    recurrence: z
      .object({
        frequency: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
        interval: z.number().int().positive().default(1),
        endDate: z
          .union([z.date(), z.string()])
          .nullable()
          .optional()
          .transform((val) => {
            if (!val) return null;
            return val instanceof Date ? val : new Date(val);
          }),
        occurrences: z.number().int().positive().nullable().optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
        dayOfMonth: z.number().int().min(1).max(31).nullable().optional()
      })
      .optional()
      .nullable(),
    reminderMinutes: z.array(z.number().int().positive()).default([])
  })
  .refine(
    (data) => {
      const now = new Date();
      now.setSeconds(0, 0); // Reset seconds and milliseconds for comparison

      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      return startDateTime >= now;
    },
    {
      message: 'Start date and time cannot be in the past.',
      path: ['startDate']
    }
  )
  .refine(
    (data) => {
      // End date should always match start date (enforced by auto-sync)
      // Only validate that end time is after start time
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Since dates are the same, only check time
      return endDateTime > startDateTime;
    },
    {
      message: 'End time must be after start time.',
      path: ['endTime']
    }
  )
  .refine(
    (data) => {
      if (data.isRecurring && data.recurrence) {
        if (!data.recurrence.endDate && !data.recurrence.occurrences) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'Either end date or number of occurrences is required for recurring meetings.',
      path: ['recurrence']
    }
  );

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

// Type for form values (with string dates for datetime-local inputs)
type MeetingFormInputValues = Omit<
  MeetingFormValues,
  'startTime' | 'endTime' | 'recurrence'
> & {
  startTime: string;
  endTime: string;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
    interval: number;
    endDate: string | null;
    occurrences: number | null;
    daysOfWeek: number[];
    dayOfMonth: number | null;
  } | null;
};

const formatTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getDefaultValues = (): any => {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(endDate.getHours() + 1); // Default to 1 hour later

  return {
    title: '',
    agenda: '',
    startDate: now,
    startTime: formatTime(now),
    endDate: endDate,
    endTime: formatTime(endDate),
    location: '',
    meetingLink: '',
    status: 'SCHEDULED' as any,
    type: 'INTERNAL_MEETING' as any,
    participantIds: [],
    isRecurring: false,
    recurrence: null,
    reminderMinutes: [],
    attachments: undefined
  };
};

export function MeetingModal() {
  const router = useRouter();
  const { isOpen, meetingId, closeModal } = useMeetingModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);

  const resolver = useMemo(() => zodResolver(meetingFormSchema), []);

  const form = useForm<any>({
    resolver,
    defaultValues: getDefaultValues()
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  const isRecurring = form.watch('isRecurring');
  const recurrenceFrequency = form.watch('recurrence?.frequency');

  // Auto-sync end date when start date changes
  useEffect(() => {
    if (startDate && (!endDate || endDate.getTime() !== startDate.getTime())) {
      form.setValue('endDate', startDate);
    }
  }, [startDate, endDate, form]);

  // Fetch meeting data when editing
  useEffect(() => {
    if (!isOpen) return;

    if (meetingId) {
      // Fetch meeting for editing
      fetch(`/api/meetings/${meetingId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.meeting) {
            setMeeting(data.meeting);
            // Get participant IDs (excluding organizer)
            const participantIds =
              data.meeting.participants
                ?.filter((p: any) => p.role === 'ATTENDEE')
                .map((p: any) => p.userId) || [];

            // Get reminder minutes (from first reminder, if any)
            const reminderMinutes =
              data.meeting.reminders?.[0]?.reminderMinutes || [];

            const startDate = new Date(data.meeting.startTime);
            const endDate = new Date(data.meeting.endTime);

            form.reset({
              title: data.meeting.title,
              agenda: data.meeting.agenda || '',
              startDate: startDate,
              startTime: formatTime(startDate),
              endDate: endDate,
              endTime: formatTime(endDate),
              location: data.meeting.location || '',
              meetingLink: data.meeting.meetingLink || '',
              status: data.meeting.status,
              type: data.meeting.type,
              participantIds,
              isRecurring: data.meeting.isRecurring,
              recurrence: data.meeting.recurrence
                ? {
                    frequency: data.meeting.recurrence.frequency,
                    interval: data.meeting.recurrence.interval,
                    endDate: data.meeting.recurrence.endDate
                      ? new Date(data.meeting.recurrence.endDate)
                      : null,
                    occurrences: data.meeting.recurrence.occurrences,
                    daysOfWeek: data.meeting.recurrence.daysOfWeek || [],
                    dayOfMonth: data.meeting.recurrence.dayOfMonth
                  }
                : null,
              reminderMinutes,
              attachments: undefined
            });
          }
        })
        .catch((error) => {
          console.error('Failed to fetch meeting:', error);
          toast.error('Failed to load meeting details');
        });
    } else {
      // Reset form for new meeting
      form.reset(getDefaultValues());
      setMeeting(null);
    }
  }, [isOpen, meetingId, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    closeModal();
    form.reset(getDefaultValues());
    setMeeting(null);
  };

  const onSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);

      // Combine date and time
      const startDateTime = new Date(values.startDate);
      const [startHours, startMinutes] = values.startTime
        .split(':')
        .map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(values.endDate);
      const [endHours, endMinutes] = values.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Upload attachments if provided
      const attachmentUrls: string[] = [];
      if (values.attachments && values.attachments.length > 0) {
        for (const file of values.attachments) {
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            attachmentUrls.push(uploadData.url);
          }
        }
      }

      const payload: any = {
        title: values.title.trim(),
        agenda: values.agenda?.trim() || null,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: values.location?.trim() || null,
        meetingLink: values.meetingLink?.trim() || null,
        status: values.status,
        type: values.type,
        participantIds: values.participantIds || [],
        isRecurring: values.isRecurring,
        reminderMinutes: values.reminderMinutes || [],
        attachmentUrls: attachmentUrls
      };

      if (values.isRecurring && values.recurrence) {
        const recurrenceEndDate =
          values.recurrence.endDate instanceof Date
            ? values.recurrence.endDate
            : values.recurrence.endDate
              ? new Date(values.recurrence.endDate)
              : null;

        payload.recurrence = {
          frequency: values.recurrence.frequency,
          interval: values.recurrence.interval,
          endDate: recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
          occurrences: values.recurrence.occurrences,
          daysOfWeek: values.recurrence.daysOfWeek || [],
          dayOfMonth: values.recurrence.dayOfMonth
        };
      }

      const endpoint = meetingId
        ? `/api/meetings/${meetingId}`
        : '/api/meetings';

      const method = meetingId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message ?? 'Failed to save meeting.');
      }

      toast.success(
        meetingId ? 'Meeting has been updated.' : 'Meeting has been created.'
      );

      router.refresh();
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = meetingId ? 'Edit Meeting' : 'Create Meeting';
  const description = meetingId
    ? 'Update meeting details.'
    : 'Schedule a new meeting and invite participants.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='!grid max-h-[calc(100vh-2rem)] !grid-rows-[auto_1fr_auto] gap-0 p-0 sm:max-w-3xl'>
        <DialogHeader className='px-6 pt-6 pb-4'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='min-h-0 overflow-hidden'
        >
          <div className='[&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 max-h-[calc(100vh-15rem)] overflow-y-auto px-6 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'>
            <div className='space-y-4'>
              <FormInput
                control={form.control}
                name='title'
                label='Meeting Title'
                placeholder='Enter meeting title'
                required
              />

              <FormTextarea
                control={form.control}
                name='agenda'
                label='Agenda'
                placeholder='Enter meeting agenda (optional)'
              />

              <FormMultiAutocomplete
                control={form.control}
                name='participantIds'
                label='Participants'
                placeholder='Search and select participants...'
                description='Select users to invite to this meeting'
                searchEndpoint='/api/users/all'
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormDatePicker
                  control={form.control}
                  name='startDate'
                  label='Start Date'
                  required
                  config={{
                    minDate: new Date(),
                    placeholder: 'Select start date'
                  }}
                />

                <FormTimePicker
                  control={form.control}
                  name='startTime'
                  label='Start Time'
                  required
                  placeholder='Select start time'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <FormDatePicker
                  control={form.control}
                  name='endDate'
                  label='End Date'
                  required
                  config={{
                    minDate: startDate || new Date(),
                    placeholder: 'Select end date'
                  }}
                />

                <FormTimePicker
                  control={form.control}
                  name='endTime'
                  label='End Time'
                  required
                  placeholder='Select end time'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <FormInput
                  control={form.control}
                  name='location'
                  label='Location'
                  placeholder='Physical location or "Virtual"'
                />

                <FormInput
                  control={form.control}
                  name='meetingLink'
                  label='Meeting Link'
                  placeholder='Zoom, Teams, or other video call link'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <FormSelect
                  control={form.control}
                  name='type'
                  label='Meeting Type'
                  placeholder='Select type'
                  options={MEETING_TYPE_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value
                  }))}
                />

                <FormSelect
                  control={form.control}
                  name='status'
                  label='Status'
                  placeholder='Select status'
                  options={MEETING_STATUS_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value
                  }))}
                />
              </div>

              <Separator />

              {/* Attachments Section */}
              <div className='space-y-2'>
                <Collapsible
                  open={isAttachmentsOpen}
                  onOpenChange={setIsAttachmentsOpen}
                >
                  <div className='flex items-center justify-between'>
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-muted-foreground hover:text-foreground'
                      >
                        <Paperclip className='mr-2 h-4 w-4' />
                        {form.watch('attachments') &&
                        Array.isArray(form.watch('attachments')) &&
                        form.watch('attachments').length > 0
                          ? `${form.watch('attachments').length} file${form.watch('attachments').length > 1 ? 's' : ''} attached`
                          : 'Attach files'}
                        <ChevronDown
                          className={`ml-2 h-4 w-4 transition-transform ${
                            isAttachmentsOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    {form.watch('attachments') &&
                      Array.isArray(form.watch('attachments')) &&
                      form.watch('attachments').length > 0 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            form.setValue('attachments', undefined);
                            setIsAttachmentsOpen(false);
                          }}
                          className='text-muted-foreground hover:text-destructive text-xs'
                        >
                          Clear
                        </Button>
                      )}
                  </div>
                  <CollapsibleContent className='mt-2'>
                    <FormFileUpload
                      control={form.control}
                      name='attachments'
                      label=''
                      description=''
                      config={{
                        maxSize: MAX_FILE_SIZE,
                        maxFiles: 10,
                        multiple: true,
                        acceptedTypes: ACCEPTED_FILE_TYPES
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <Separator />

              {/* Recurring Meeting Section */}
              <div className='space-y-4'>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='isRecurring'
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      form.setValue('isRecurring', checked as boolean);
                      if (!checked) {
                        form.setValue('recurrence', null);
                      } else {
                        form.setValue('recurrence', {
                          frequency: 'WEEKLY',
                          interval: 1,
                          endDate: null,
                          occurrences: null,
                          daysOfWeek: [],
                          dayOfMonth: null
                        });
                      }
                    }}
                  />
                  <Label htmlFor='isRecurring' className='cursor-pointer'>
                    Recurring Meeting
                  </Label>
                </div>

                {isRecurring && (
                  <div className='ml-6 space-y-4 border-l-2 pl-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <FormSelect
                        control={form.control}
                        name='recurrence.frequency'
                        label='Frequency'
                        placeholder='Select frequency'
                        options={RECURRENCE_FREQUENCY_OPTIONS}
                      />

                      <FormInput
                        control={form.control}
                        name='recurrence.interval'
                        label='Interval'
                        type='number'
                        placeholder='Every N days/weeks/months'
                      />
                    </div>

                    {recurrenceFrequency === 'WEEKLY' && (
                      <div className='space-y-2'>
                        <Label>Days of Week</Label>
                        <div className='flex flex-wrap gap-2'>
                          {DAYS_OF_WEEK_OPTIONS.map((day) => (
                            <div
                              key={day.value}
                              className='flex items-center space-x-2'
                            >
                              <Checkbox
                                checked={(
                                  (form.watch(
                                    'recurrence.daysOfWeek'
                                  ) as number[]) || []
                                ).includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const currentDays =
                                    (form.getValues(
                                      'recurrence.daysOfWeek'
                                    ) as number[]) || [];
                                  if (checked) {
                                    form.setValue('recurrence.daysOfWeek', [
                                      ...currentDays,
                                      day.value
                                    ]);
                                  } else {
                                    form.setValue(
                                      'recurrence.daysOfWeek',
                                      currentDays.filter(
                                        (d: number) => d !== day.value
                                      )
                                    );
                                  }
                                }}
                              />
                              <Label className='cursor-pointer text-sm'>
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {recurrenceFrequency === 'MONTHLY' && (
                      <FormInput
                        control={form.control}
                        name='recurrence.dayOfMonth'
                        label='Day of Month'
                        type='number'
                        placeholder='Day of month (1-31)'
                      />
                    )}

                    <div className='grid grid-cols-2 gap-4'>
                      <FormInput
                        control={form.control}
                        name='recurrence.endDate'
                        label='End Date (Optional)'
                        type='date'
                      />

                      <FormInput
                        control={form.control}
                        name='recurrence.occurrences'
                        label='Number of Occurrences (Optional)'
                        type='number'
                        placeholder='Total occurrences'
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Reminders Section */}
              <div className='space-y-2'>
                <Label>Reminders</Label>
                <div className='flex flex-wrap gap-2'>
                  {REMINDER_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className='flex items-center space-x-2'
                    >
                      <Checkbox
                        checked={(
                          (form.watch('reminderMinutes') as number[]) || []
                        ).includes(option.value)}
                        onCheckedChange={(checked) => {
                          const currentReminders =
                            (form.getValues('reminderMinutes') as number[]) ||
                            [];
                          if (checked) {
                            form.setValue('reminderMinutes', [
                              ...currentReminders,
                              option.value
                            ]);
                          } else {
                            form.setValue(
                              'reminderMinutes',
                              currentReminders.filter(
                                (m: number) => m !== option.value
                              )
                            );
                          }
                        }}
                      />
                      <Label className='cursor-pointer text-sm'>
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className='shrink-0 border-t px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : meetingId
                  ? 'Update Meeting'
                  : 'Create Meeting'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
