'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormRichTextEditor } from '@/components/forms/form-rich-text-editor';
import { FormSelect } from '@/components/forms/form-select';
import { X, Send } from 'lucide-react';
import { MeetingNoteType } from '@prisma/client';

const NOTE_TYPE_OPTIONS = [
  { value: MeetingNoteType.NOTE, label: 'Note' },
  { value: MeetingNoteType.AGENDA, label: 'Agenda' },
  { value: MeetingNoteType.MINUTES, label: 'Minutes' }
];

const editNoteSchema = z.object({
  type: z.nativeEnum(MeetingNoteType),
  content: z
    .string()
    .min(1, 'Content is required')
    .refine((html) => {
      const text = html.replace(/<[^>]*>/g, '').trim();
      return text.length > 0;
    }, 'Content is required')
});

type EditNoteFormValues = z.infer<typeof editNoteSchema>;

interface MeetingNoteEditFormProps {
  note: {
    id: string;
    type: MeetingNoteType;
    content: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export function MeetingNoteEditForm({
  note,
  onCancel,
  onSuccess
}: MeetingNoteEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditNoteFormValues>({
    resolver: zodResolver(editNoteSchema),
    defaultValues: {
      type: note.type,
      content: note.content
    }
  });

  const onSubmit = async (values: EditNoteFormValues) => {
    try {
      setIsSubmitting(true);
      const pathParts = window.location.pathname.split('/');
      const meetingId = pathParts[pathParts.indexOf('meetings') + 1];

      const res = await fetch(`/api/meetings/${meetingId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: values.type,
          content: values.content.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to update note');
      }

      toast.success('Note updated successfully');
      onSuccess();
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
            placeholder='Edit your note...'
            required
          />
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className='mr-2 h-4 w-4' />
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting} size='sm'>
              <Send className='mr-2 h-4 w-4' />
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
