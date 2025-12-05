'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormRichTextEditor } from '@/components/forms/form-rich-text-editor';
import { FormFileUpload } from '@/components/forms/form-file-upload';
import { FormSelect } from '@/components/forms/form-select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Send, Paperclip, ChevronDown } from 'lucide-react';
import { MeetingNoteType } from '@prisma/client';

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

const NOTE_TYPE_OPTIONS = [
  { value: MeetingNoteType.NOTE, label: 'Note' },
  { value: MeetingNoteType.AGENDA, label: 'Agenda' },
  { value: MeetingNoteType.MINUTES, label: 'Minutes' }
];

const noteFormSchema = z.object({
  type: z.nativeEnum(MeetingNoteType).default(MeetingNoteType.NOTE),
  content: z
    .string()
    .min(1, 'Content is required')
    .refine((html) => {
      const text = html.replace(/<[^>]*>/g, '').trim();
      return text.length > 0;
    }, 'Content is required'),
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

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface MeetingNoteFormProps {
  meetingId: string;
  assignedUserIds?: string[];
  assignedUsers?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}

export function MeetingNoteForm({
  meetingId,
  assignedUserIds,
  assignedUsers
}: MeetingNoteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      type: MeetingNoteType.NOTE,
      content: '',
      files: undefined
    }
  });

  const watchFiles = form.watch('files');
  const hasFiles =
    watchFiles && Array.isArray(watchFiles) && watchFiles.length > 0;

  const onSubmit = async (values: NoteFormValues) => {
    try {
      setIsSubmitting(true);

      // Upload files (if any) and collect mediaIds
      const mediaIds: string[] = [];
      const files = values.files as File[] | undefined;

      if (files && files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('meetingId', meetingId);

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

      // Create note
      const res = await fetch(`/api/meetings/${meetingId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: values.type,
          content: values.content.trim(),
          mediaIds
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to add note');
      }

      toast.success('Note added successfully');
      form.reset();
      setIsFileUploadOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='bg-card rounded-lg border p-4'>
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className='space-y-4'>
          <FormSelect
            control={form.control}
            name='type'
            label='Note Type'
            placeholder='Select note type'
            options={NOTE_TYPE_OPTIONS}
          />

          <FormRichTextEditor
            name='content'
            placeholder='Add a note...'
            required
            assignedUserIds={assignedUserIds}
            assignedUsers={assignedUsers}
          />

          {/* Collapsible File Upload */}
          <Collapsible
            open={isFileUploadOpen}
            onOpenChange={setIsFileUploadOpen}
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
                  {hasFiles
                    ? `${(watchFiles as File[]).length} file${(watchFiles as File[]).length > 1 ? 's' : ''} attached`
                    : 'Attach files'}
                  <ChevronDown
                    className={`ml-2 h-4 w-4 transition-transform ${
                      isFileUploadOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {hasFiles && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    form.setValue('files', undefined);
                    setIsFileUploadOpen(false);
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
                name='files'
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

          <div className='flex justify-end'>
            <Button type='submit' disabled={isSubmitting} size='sm'>
              <Send className='mr-2 h-4 w-4' />
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
