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
import { FormSelect } from '@/components/forms/form-select';
import { FormAutocomplete } from '@/components/forms/form-autocomplete';
import { FormMultiAutocomplete } from '@/components/forms/form-multi-autocomplete';
import { FormFileUpload } from '@/components/forms/form-file-upload';
import { Button } from '@/components/ui/button';
import { useEventModal } from '@/features/events/hooks/use-event-modal';
import { EventStatus } from '@prisma/client';
import { EVENT_STATUS_OPTIONS } from '@/features/events/components/event-tables/options';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const eventFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().or(z.literal('')),
    clientId: z.string().min(1, 'Client is required'),
    venue: z.string().optional().or(z.literal('')),
    featuredImage: z
      .any()
      .optional()
      .refine(
        (files) => !files || files.length === 0 || files.length === 1,
        'Only one image can be uploaded'
      )
      .refine(
        (files) =>
          !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE,
        `Max file size is 5MB.`
      )
      .refine(
        (files) =>
          !files ||
          files.length === 0 ||
          ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
        '.jpg, .jpeg, .png and .webp files are accepted.'
      ),
    startDate: z.date(),
    endDate: z.date(),
    status: z.nativeEnum(EventStatus).default(EventStatus.SCHEDULED),
    staffIds: z.array(z.string()).optional().default([])
  })
  .refine(
    (data) => {
      return data.endDate >= data.startDate;
    },
    {
      message: 'End date must be after or equal to start date.',
      path: ['endDate']
    }
  );

type EventFormValues = z.infer<typeof eventFormSchema>;

const getDefaultValues = (): EventFormValues => ({
  title: '',
  description: '',
  clientId: '',
  venue: '',
  featuredImage: undefined,
  startDate: new Date(),
  endDate: new Date(),
  status: EventStatus.SCHEDULED,
  staffIds: []
});

export function EventModal() {
  const router = useRouter();
  const { isOpen, eventId, closeModal } = useEventModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [event, setEvent] = useState<any>(null);

  const resolver = useMemo(() => zodResolver(eventFormSchema), []);

  const form = useForm<EventFormValues>({
    resolver,
    defaultValues: getDefaultValues()
  });

  // Fetch event data when editing
  useEffect(() => {
    if (!isOpen) return;

    if (eventId) {
      // Fetch event for editing
      fetch(`/api/events/${eventId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.event) {
            setEvent(data.event);
            // Get staff participant IDs
            const staffIds =
              data.event.participants
                ?.filter((p: any) => p.role === 'STAFF')
                .map((p: any) => p.userId) || [];

            form.reset({
              title: data.event.title,
              description: data.event.description || '',
              clientId: data.event.clientId,
              venue: data.event.venue || '',
              featuredImage: undefined, // We don't pre-populate file inputs
              startDate: new Date(data.event.startDate),
              endDate: new Date(data.event.endDate),
              status: data.event.status,
              staffIds
            });
          }
        })
        .catch((error) => {
          console.error('Failed to fetch event:', error);
          toast.error('Failed to load event details');
        });
    } else {
      // Reset form for new event
      form.reset(getDefaultValues());
      setEvent(null);
    }
  }, [isOpen, eventId, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    closeModal();
    form.reset(getDefaultValues());
    setEvent(null);
  };

  const onSubmit = async (values: EventFormValues) => {
    try {
      setIsSubmitting(true);

      // Upload featured image if provided
      let featuredImageUrl: string | null = null;
      if (values.featuredImage && values.featuredImage.length > 0) {
        const formData = new FormData();
        formData.append('file', values.featuredImage[0]);

        const uploadResponse = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        featuredImageUrl = uploadData.url;
      } else if (eventId && event) {
        // Keep existing image if no new image is uploaded
        featuredImageUrl = event.featuredImageUrl || null;
      }

      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        clientId: values.clientId,
        venue: values.venue?.trim() || null,
        featuredImageUrl,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        status: values.status,
        staffIds: values.staffIds || []
      };

      const endpoint = eventId ? `/api/events/${eventId}` : '/api/events';

      const method = eventId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message ?? 'Failed to save event.');
      }

      toast.success(
        eventId ? 'Event has been updated.' : 'Event has been created.'
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

  const title = eventId ? 'Edit Event' : 'Create Event';
  const description = eventId
    ? 'Update event details.'
    : 'Create a new event and assign it to a client.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='!grid max-h-[calc(100vh-2rem)] !grid-rows-[auto_1fr_auto] gap-0 p-0 sm:max-w-2xl'>
        <DialogHeader className='px-6 pt-6 pb-4'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='min-h-0 overflow-hidden'
        >
          <div className='[&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 max-h-[calc(100vh-15rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'>
            <div className='space-y-4 px-6 py-2'>
              <FormInput
                control={form.control}
                name='title'
                label='Event Title'
                placeholder='Enter event title'
                required
              />

              <FormTextarea
                control={form.control}
                name='description'
                label='Description'
                placeholder='Enter event description (optional)'
              />

              <FormInput
                control={form.control}
                name='venue'
                label='Venue'
                placeholder='Enter venue (optional)'
              />

              <FormFileUpload
                control={form.control}
                name='featuredImage'
                label='Featured Image'
                description='Upload a featured image for this event (optional)'
                config={{
                  maxSize: MAX_FILE_SIZE,
                  maxFiles: 1,
                  acceptedTypes: ACCEPTED_IMAGE_TYPES
                }}
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormDatePicker
                  control={form.control}
                  name='startDate'
                  label='Start Date'
                  required
                />

                <FormDatePicker
                  control={form.control}
                  name='endDate'
                  label='End Date'
                  required
                />
              </div>

              <FormAutocomplete
                control={form.control}
                name='clientId'
                label='Client'
                placeholder='Search for client...'
                required
                searchEndpoint='/api/users/search?role=CLIENT'
              />

              <FormMultiAutocomplete
                control={form.control}
                name='staffIds'
                label='Assign Staff'
                placeholder='Search and select staff members...'
                description='Select staff members to assign to this event'
                searchEndpoint='/api/users/search?role=STAFF'
              />

              <FormSelect
                control={form.control}
                name='status'
                label='Status'
                placeholder='Select status'
                options={EVENT_STATUS_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: opt.value
                }))}
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
              {isSubmitting
                ? 'Saving...'
                : eventId
                  ? 'Update Event'
                  : 'Create Event'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
