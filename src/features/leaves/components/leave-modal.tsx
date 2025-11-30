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
import { FormSelect } from '@/components/forms/form-select';
import { FormDatePicker } from '@/components/forms/form-date-picker';
import { FormTextarea } from '@/components/forms/form-textarea';
import { FormRadioGroup } from '@/components/forms/form-radio-group';
import { FormSwitch } from '@/components/forms/form-switch';
import { Button } from '@/components/ui/button';
import { useLeaveModal } from '@/features/leaves/hooks/use-leave-modal';
import { LEAVE_TYPE_OPTIONS } from '@/features/leaves/components/leave-tables/options';
import { LeaveType, HalfDayType } from '@prisma/client';

const leaveFormSchema = z
  .object({
    leaveType: z.nativeEnum(LeaveType),
    startDate: z.date(),
    endDate: z.date(),
    isHalfDay: z.boolean().default(false),
    halfDayType: z.nativeEnum(HalfDayType).optional(),
    reason: z.string().min(10, 'Reason must be at least 10 characters.'),
    notes: z.string().optional().or(z.literal(''))
  })
  .refine(
    (data) => {
      if (data.isHalfDay) {
        return !!data.halfDayType;
      }
      return true;
    },
    {
      message: 'Please select first half or second half.',
      path: ['halfDayType']
    }
  )
  .refine(
    (data) => {
      if (data.isHalfDay) {
        // For half day, start and end date should be the same
        return data.startDate.toDateString() === data.endDate.toDateString();
      }
      return true;
    },
    {
      message: 'For half day leave, start and end date must be the same.',
      path: ['endDate']
    }
  )
  .refine(
    (data) => {
      return data.endDate >= data.startDate;
    },
    {
      message: 'End date must be after or equal to start date.',
      path: ['endDate']
    }
  );

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

const defaultValues: LeaveFormValues = {
  leaveType: LeaveType.ANNUAL,
  startDate: new Date(),
  endDate: new Date(),
  isHalfDay: false,
  halfDayType: undefined,
  reason: '',
  notes: ''
};

const halfDayOptions = [
  { value: 'FIRST_HALF', label: 'First Half' },
  { value: 'SECOND_HALF', label: 'Second Half' }
];

export function LeaveModal() {
  const router = useRouter();
  const { isOpen, mode, leave, close } = useLeaveModal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolver = useMemo(() => zodResolver(leaveFormSchema), []);

  const form = useForm<LeaveFormValues>({
    resolver,
    defaultValues
  });

  const isHalfDay = form.watch('isHalfDay');
  const startDate = form.watch('startDate');

  // When half day is toggled, set end date to start date
  useEffect(() => {
    if (isHalfDay && startDate) {
      form.setValue('endDate', startDate);
    }
  }, [isHalfDay, startDate, form]);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && leave) {
      form.reset({
        leaveType: leave.leaveType,
        startDate: new Date(leave.startDate),
        endDate: new Date(leave.endDate),
        isHalfDay: leave.isHalfDay,
        halfDayType: leave.halfDayType ?? undefined,
        reason: leave.reason,
        notes: leave.notes ?? ''
      });
      return;
    }

    form.reset(defaultValues);
  }, [isOpen, mode, leave, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    close();
    form.reset(defaultValues);
  };

  const onSubmit = async (values: LeaveFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        leaveType: values.leaveType,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        isHalfDay: values.isHalfDay,
        halfDayType: values.isHalfDay ? values.halfDayType : null,
        reason: values.reason.trim(),
        notes: values.notes?.trim() || null
      };

      const endpoint =
        mode === 'create' ? '/api/leaves' : `/api/leaves/${leave?.id}`;

      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.message ?? 'Failed to save leave request.'
        );
      }

      toast.success(
        mode === 'create'
          ? 'Leave request has been submitted.'
          : 'Leave request has been updated.'
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

  const title = mode === 'create' ? 'Request Leave' : 'Edit Leave Request';
  const description =
    mode === 'create'
      ? 'Submit a new leave request for approval.'
      : 'Update your leave request details.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-6'>
            <FormSelect
              control={form.control}
              name='leaveType'
              label='Leave Type'
              placeholder='Select leave type'
              options={LEAVE_TYPE_OPTIONS}
              required
              disabled={isSubmitting || mode === 'edit'}
            />

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FormDatePicker
                control={form.control}
                name='startDate'
                label='Start Date'
                required
                disabled={isSubmitting || mode === 'edit'}
                config={{
                  minDate: new Date(),
                  placeholder: 'Select start date'
                }}
              />
              <FormDatePicker
                control={form.control}
                name='endDate'
                label='End Date'
                required
                disabled={isSubmitting || mode === 'edit' || isHalfDay}
                config={{
                  minDate: startDate || new Date(),
                  placeholder: 'Select end date'
                }}
              />
            </div>

            <FormSwitch
              control={form.control}
              name='isHalfDay'
              label='Half Day Leave'
              description='Check if this is a half day leave'
              disabled={isSubmitting || mode === 'edit'}
            />

            {isHalfDay && (
              <FormRadioGroup
                control={form.control}
                name='halfDayType'
                label='Half Day Type'
                options={halfDayOptions}
                orientation='horizontal'
                required
                disabled={isSubmitting || mode === 'edit'}
              />
            )}

            <FormTextarea
              control={form.control}
              name='reason'
              label='Reason'
              placeholder='Please provide a reason for your leave request...'
              config={{ rows: 4 }}
              required
              disabled={isSubmitting}
            />

            <FormTextarea
              control={form.control}
              name='notes'
              label='Additional Notes (Optional)'
              placeholder='Add any additional information...'
              config={{ rows: 3 }}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className='mt-6'>
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
                ? 'Submitting...'
                : mode === 'create'
                  ? 'Submit Request'
                  : 'Update Request'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
