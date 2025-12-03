'use client';

import { useState, useMemo, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { EventUpdateType, EventStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useEventUpdateModal } from '@/features/events/hooks/use-event-update-modal';
import { FormTextarea } from '@/components/forms/form-textarea';
import { FormSelect } from '@/components/forms/form-select';
import { FormFileUpload } from '@/components/forms/form-file-upload';

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

const EVENT_UPDATE_TYPE_OPTIONS = [
  { label: 'Note', value: EventUpdateType.NOTE },
  { label: 'Status', value: EventUpdateType.STATUS },
  { label: 'Milestone', value: EventUpdateType.MILESTONE },
  { label: 'Issue', value: EventUpdateType.ISSUE }
];

const EVENT_STATUS_OPTIONS = [
  { label: 'Scheduled', value: EventStatus.SCHEDULED },
  { label: 'In Progress', value: EventStatus.IN_PROGRESS },
  { label: 'Completed', value: EventStatus.COMPLETED },
  { label: 'Cancelled', value: EventStatus.CANCELLED }
];

const updateFormSchema = z.object({
  type: z.nativeEnum(EventUpdateType).default(EventUpdateType.NOTE),
  status: z.nativeEnum(EventStatus).optional(),
  message: z.string().min(1, 'Message is required'),
  files: z
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
    )
});

type UpdateFormValues = z.infer<typeof updateFormSchema>;

export function EventUpdateModal() {
  const router = useRouter();
  const { isOpen, eventId, eventTitle, closeModal } = useEventUpdateModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEventStatus, setCurrentEventStatus] =
    useState<EventStatus | null>(null);

  const resolver = useMemo(() => zodResolver(updateFormSchema), []);

  const form = useForm<UpdateFormValues>({
    resolver,
    defaultValues: {
      type: EventUpdateType.NOTE,
      status: undefined,
      message: '',
      files: undefined
    }
  });

  const selectedType = form.watch('type');

  // Fetch current event status when modal opens
  useEffect(() => {
    if (isOpen && eventId) {
      fetch(`/api/events/${eventId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.event?.status) {
            const status = data.event.status as EventStatus;
            setCurrentEventStatus(status);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch event status:', error);
        });
    } else {
      setCurrentEventStatus(null);
    }
  }, [isOpen, eventId]);

  // Set status to current event status when type changes to STATUS or when status loads
  // Reset status when type changes away from STATUS
  useEffect(() => {
    if (selectedType === EventUpdateType.STATUS) {
      if (currentEventStatus) {
        // Set the value, ensuring the field is ready
        const timer = setTimeout(() => {
          form.setValue('status', currentEventStatus, {
            shouldValidate: false,
            shouldDirty: false
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      form.setValue('status', undefined, {
        shouldValidate: false,
        shouldDirty: false
      });
    }
  }, [selectedType, currentEventStatus, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    closeModal();
    setCurrentEventStatus(null);
    form.reset({
      type: EventUpdateType.NOTE,
      status: undefined,
      message: '',
      files: undefined
    });
  };

  const onSubmit = async (values: UpdateFormValues) => {
    if (!eventId) {
      toast.error('Missing event ID for update');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload files (if any) and collect mediaIds
      const mediaIds: string[] = [];
      const files = values.files as File[] | undefined;

      if (files && files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('eventId', eventId);

          const uploadRes = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) {
            const errJson = await uploadRes.json().catch(() => null);
            throw new Error(
              errJson?.error || `Failed to upload image: ${file.name}`
            );
          }

          const uploadJson = await uploadRes.json();
          if (uploadJson.mediaId) {
            mediaIds.push(uploadJson.mediaId);
          }
        }
      }

      // Create update
      const res = await fetch(`/api/events/${eventId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: values.type,
          status: values.status || null,
          message: values.message.trim(),
          metadata: null,
          mediaIds
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.error || json?.message || 'Failed to create update'
        );
      }

      toast.success('Update posted');
      router.refresh();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = eventTitle ? `Add Update • ${eventTitle}` : 'Add Event Update';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='!grid max-h-[calc(100vh-2rem)] !grid-rows-[auto_1fr_auto] gap-0 p-0 sm:max-w-2xl'>
        <DialogHeader className='px-6 pt-6 pb-4'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Share an update about the event. You can attach images if needed.
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='min-h-0 overflow-hidden'
        >
          <div className='[&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 max-h-[calc(100vh-15rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'>
            <div className='space-y-4 px-6 py-2'>
              <FormSelect
                control={form.control}
                name='type'
                label='Type'
                placeholder='Select update type'
                options={EVENT_UPDATE_TYPE_OPTIONS}
                required
                className='w-full'
              />

              {selectedType === EventUpdateType.STATUS && (
                <FormSelect
                  control={form.control}
                  name='status'
                  label='Status'
                  placeholder='Select event status'
                  options={EVENT_STATUS_OPTIONS}
                  className='w-full'
                />
              )}

              <FormTextarea
                control={form.control}
                name='message'
                label='Message'
                placeholder='Describe the current status, progress, or issues...'
                config={{ rows: 4 }}
                required
              />

              <FormFileUpload
                control={form.control}
                name='files'
                label='Attachments'
                description='Upload images or documents for this update (optional). Supported formats: JPEG, PNG, WebP, PDF, DOC, DOCX. Max size per file: 5MB.'
                config={{
                  maxSize: MAX_FILE_SIZE,
                  maxFiles: 10,
                  multiple: true,
                  acceptedTypes: ACCEPTED_FILE_TYPES
                }}
              />
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
              {isSubmitting ? 'Posting...' : 'Post Update'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
