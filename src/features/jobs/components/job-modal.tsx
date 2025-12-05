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
import { useJobModal } from '@/features/jobs/hooks/use-job-modal';
import { JobStatus, JobPriority } from '@prisma/client';
import {
  JOB_STATUS_OPTIONS,
  JOB_PRIORITY_OPTIONS
} from '@/features/jobs/components/job-tables/options';
import type { JobListItem } from '@/features/jobs/types';

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

const jobFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  remarks: z.string().optional().or(z.literal('')),
  status: z.nativeEnum(JobStatus).default(JobStatus.NOT_STARTED),
  priority: z.nativeEnum(JobPriority).optional().nullable(),
  dueDate: z.date().optional().nullable(),
  eventId: z.string().optional().nullable().or(z.literal('')),
  staffIds: z
    .array(z.string())
    .min(1, 'At least one staff member must be assigned'),
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

type JobFormValues = z.infer<typeof jobFormSchema>;

const getDefaultValues = (): JobFormValues => ({
  title: '',
  remarks: '',
  status: JobStatus.NOT_STARTED,
  priority: null,
  dueDate: null,
  eventId: null,
  staffIds: [],
  files: undefined
});

export function JobModal() {
  const router = useRouter();
  const { isOpen, job, closeModal } = useJobModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobData, setJobData] = useState<any>(null);

  const resolver = useMemo(() => zodResolver(jobFormSchema), []);

  const form = useForm<JobFormValues>({
    resolver,
    defaultValues: getDefaultValues()
  });

  // Fetch job data when editing
  useEffect(() => {
    if (!isOpen) return;

    if (job) {
      // Fetch full job details for editing
      fetch(`/api/jobs/${job.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.job) {
            setJobData(data.job);
            const staffIds =
              data.job.assignees?.map((a: any) => a.userId) || [];

            form.reset({
              title: data.job.title,
              remarks: data.job.remarks || '',
              status: data.job.status,
              priority: data.job.priority,
              dueDate: data.job.dueDate ? new Date(data.job.dueDate) : null,
              eventId: data.job.eventId || null,
              staffIds,
              files: undefined
            });
          }
        })
        .catch((error) => {
          console.error('Failed to fetch job:', error);
          toast.error('Failed to load job details');
        });
    } else {
      // Reset form for new job
      form.reset(getDefaultValues());
      setJobData(null);
    }
  }, [isOpen, job, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    closeModal();
    form.reset(getDefaultValues());
    setJobData(null);
  };

  const onSubmit = async (values: JobFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        title: values.title.trim(),
        remarks: values.remarks?.trim() || null,
        status: values.status,
        priority: values.priority || null,
        dueDate: values.dueDate?.toISOString() || null,
        eventId: values.eventId || null,
        staffIds: values.staffIds || []
      };

      const endpoint = job?.id ? `/api/jobs/${job.id}` : '/api/jobs';
      const method = job?.id ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message ?? 'Failed to save job.');
      }

      // Upload files if creating new job
      if (
        !job?.id &&
        values.files &&
        Array.isArray(values.files) &&
        values.files.length > 0
      ) {
        const jobId = responseData.job?.id;
        if (jobId) {
          for (const file of values.files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('jobId', jobId);

            await fetch('/api/upload/image', {
              method: 'POST',
              body: formData
            });
          }
        }
      }

      toast.success(
        job?.id ? 'Job has been updated.' : 'Job has been created.'
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

  const title = job ? 'Edit Job' : 'Create Job';
  const description = job
    ? 'Update job details.'
    : 'Create a new job and assign it to staff members.';

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
                label='Job Title'
                placeholder='Enter job title'
                required
              />

              <FormTextarea
                control={form.control}
                name='remarks'
                label='Remarks'
                placeholder='Enter job remarks (optional)'
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormSelect
                  control={form.control}
                  name='priority'
                  label='Priority'
                  placeholder='Select priority'
                  options={JOB_PRIORITY_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value
                  }))}
                />

                <FormSelect
                  control={form.control}
                  name='status'
                  label='Status'
                  placeholder='Select status'
                  options={JOB_STATUS_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value
                  }))}
                />
              </div>

              <FormDatePicker
                control={form.control}
                name='dueDate'
                label='Due Date'
              />

              {/* Event linking will be added later with proper event search */}

              <FormMultiAutocomplete
                control={form.control}
                name='staffIds'
                label='Assign Staff'
                placeholder='Search and select staff members...'
                description='Select staff members to assign to this job'
                required
                searchEndpoint='/api/users/search?role=STAFF'
              />

              {!job?.id && (
                <FormFileUpload
                  control={form.control}
                  name='files'
                  label='Attachments'
                  description='Upload images or documents (optional)'
                  config={{
                    maxSize: MAX_FILE_SIZE,
                    maxFiles: 10,
                    multiple: true,
                    acceptedTypes: ACCEPTED_FILE_TYPES
                  }}
                />
              )}
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
                : job?.id
                  ? 'Update Job'
                  : 'Create Job'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
