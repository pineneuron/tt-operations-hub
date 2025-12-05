'use client';

import { useState, useMemo, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { JobStatus, JobUpdateType } from '@prisma/client';
import type { JobUpdateType as JobUpdateTypeType } from '@prisma/client';
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
import { useJobUpdateModal } from '@/features/jobs/hooks/use-job-update-modal';
import { FormRichTextEditor } from '@/components/forms/form-rich-text-editor';
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

// Use string literals to avoid runtime enum import issues with Turbopack
const JOB_UPDATE_TYPE_OPTIONS = [
  { label: 'Note', value: 'NOTE' as JobUpdateTypeType },
  { label: 'Status', value: 'STATUS' as JobUpdateTypeType },
  { label: 'Milestone', value: 'MILESTONE' as JobUpdateTypeType },
  { label: 'Issue', value: 'ISSUE' as JobUpdateTypeType }
];

const JOB_STATUS_OPTIONS = [
  { label: 'Not Started', value: JobStatus.NOT_STARTED },
  { label: 'In Progress', value: JobStatus.IN_PROGRESS },
  { label: 'In Review', value: JobStatus.IN_REVIEW },
  { label: 'Blocked', value: JobStatus.BLOCKED },
  { label: 'Completed', value: JobStatus.COMPLETED }
];

const updateFormSchema = z.object({
  type: z.nativeEnum(JobUpdateType).default('NOTE' as JobUpdateTypeType),
  status: z.nativeEnum(JobStatus).optional(),
  message: z
    .string()
    .min(1, 'Message is required')
    .refine((html) => {
      // Remove HTML tags and check if there's actual content
      const text = html.replace(/<[^>]*>/g, '').trim();
      return text.length > 0;
    }, 'Message is required'),
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

export function JobUpdateModal() {
  const router = useRouter();
  const { isOpen, jobId, closeModal } = useJobUpdateModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<JobStatus | null>(
    null
  );

  const resolver = useMemo(() => zodResolver(updateFormSchema), []);

  const form = useForm<UpdateFormValues>({
    resolver,
    defaultValues: {
      type: 'NOTE' as JobUpdateTypeType,
      status: undefined,
      message: '',
      files: undefined
    }
  });

  const selectedType = form.watch('type');

  // Fetch current job status when modal opens
  useEffect(() => {
    if (isOpen && jobId) {
      fetch(`/api/jobs/${jobId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.job?.status) {
            const status = data.job.status as JobStatus;
            setCurrentJobStatus(status);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch job status:', error);
        });
    } else {
      setCurrentJobStatus(null);
    }
  }, [isOpen, jobId]);

  // Set status to current job status when type changes to STATUS or when status loads
  useEffect(() => {
    if (selectedType === 'STATUS') {
      if (currentJobStatus) {
        form.setValue('status', currentJobStatus, {
          shouldValidate: false,
          shouldDirty: false
        });
      }
    } else {
      form.setValue('status', undefined, {
        shouldValidate: false,
        shouldDirty: false
      });
    }
  }, [selectedType, currentJobStatus, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    closeModal();
    setCurrentJobStatus(null);
    form.reset({
      type: 'NOTE' as JobUpdateTypeType,
      status: undefined,
      message: '',
      files: undefined
    });
  };

  const onSubmit = async (values: UpdateFormValues) => {
    if (!jobId) {
      toast.error('Missing job ID for update');
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
          formData.append('jobId', jobId);

          const uploadRes = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) {
            const errJson = await uploadRes.json().catch(() => null);
            throw new Error(
              errJson?.error || `Failed to upload file: ${file.name}`
            );
          }

          const uploadJson = await uploadRes.json();
          if (uploadJson.mediaId) {
            mediaIds.push(uploadJson.mediaId);
          }
        }
      }

      // Create update
      const res = await fetch(`/api/jobs/${jobId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: values.type,
          status: values.type === 'STATUS' ? values.status : null,
          message: values.message.trim(),
          mediaIds
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to create job update');
      }

      toast.success('Job update posted successfully');
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='!grid max-h-[calc(100vh-2rem)] !grid-rows-[auto_1fr_auto] gap-0 p-0 sm:max-w-2xl'>
        <DialogHeader className='px-6 pt-6 pb-4'>
          <DialogTitle>Add Job Update</DialogTitle>
          <DialogDescription>
            Post an update about this job's progress.
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
                label='Update Type'
                placeholder='Select update type'
                options={JOB_UPDATE_TYPE_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: opt.value
                }))}
              />

              {selectedType === 'STATUS' && (
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
              )}

              <FormRichTextEditor
                name='message'
                label='Message'
                placeholder='Enter update message...'
                required
              />

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
