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
import { X, Send } from 'lucide-react';

const editCommentSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .refine((html) => {
      // Remove HTML tags and check if there's actual content
      const text = html.replace(/<[^>]*>/g, '').trim();
      return text.length > 0;
    }, 'Message is required')
});

type EditCommentFormValues = z.infer<typeof editCommentSchema>;

interface CommentEditFormProps {
  update: {
    id: string;
    message: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export function CommentEditForm({
  update,
  onCancel,
  onSuccess
}: CommentEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditCommentFormValues>({
    resolver: zodResolver(editCommentSchema),
    defaultValues: {
      message: update.message
    }
  });

  const onSubmit = async (values: EditCommentFormValues) => {
    try {
      setIsSubmitting(true);
      // Extract jobId from the URL
      const pathParts = window.location.pathname.split('/');
      const jobId = pathParts[pathParts.indexOf('jobs') + 1];

      const res = await fetch(`/api/jobs/${jobId}/updates/${update.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: values.message.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to update comment');
      }

      toast.success('Comment updated successfully');
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
          <FormRichTextEditor
            name='message'
            placeholder='Edit your comment...'
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
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
