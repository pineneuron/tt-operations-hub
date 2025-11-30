'use client';

import { useEffect, useState } from 'react';
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
import { FormSwitch } from '@/components/forms/form-switch';
import { FormSelect } from '@/components/forms/form-select';
import { FormDatePicker } from '@/components/forms/form-date-picker';
import { Button } from '@/components/ui/button';
import { useHolidayModal } from '@/features/holidays/hooks/use-holiday-modal';
import { YEAR_OPTIONS } from '@/features/holidays/components/holiday-tables/options';

const holidayFormSchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  date: z.date(),
  year: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        return parseInt(val, 10);
      }
      return val;
    })
    .pipe(z.number().min(2020).max(2100)),
  isRecurring: z.boolean().default(false),
  description: z.string().optional().or(z.literal(''))
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

const getDefaultValues = (): HolidayFormValues => {
  const currentYear = new Date().getFullYear();
  return {
    category: '',
    date: new Date(),
    year: currentYear,
    isRecurring: false,
    description: ''
  };
};

export function HolidayModal() {
  const router = useRouter();
  const { isOpen, holidayId, close } = useHolidayModal();
  const [loading, setLoading] = useState(false);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: getDefaultValues()
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { label: String(currentYear), value: String(currentYear) },
    { label: String(currentYear + 1), value: String(currentYear + 1) }
  ];

  useEffect(() => {
    if (isOpen && holidayId) {
      // Fetch holiday data for editing
      fetch(`/api/holidays/${holidayId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.holiday) {
            const holidayDate = new Date(data.holiday.date);
            form.reset({
              category: data.holiday.category,
              date: holidayDate,
              year: data.holiday.year,
              isRecurring: data.holiday.isRecurring,
              description: data.holiday.description || ''
            });
          }
        })
        .catch(() => {
          toast.error('Failed to load holiday data.');
        });
    } else if (isOpen && !holidayId) {
      // Reset form for creating new holiday
      form.reset(getDefaultValues());
    }
  }, [isOpen, holidayId, form, currentYear]);

  const onSubmit = async (values: HolidayFormValues) => {
    try {
      setLoading(true);

      const url = holidayId ? `/api/holidays/${holidayId}` : '/api/holidays';
      const method = holidayId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: values.category,
          date: values.date.toISOString(),
          year: values.year,
          isRecurring: values.isRecurring,
          description: values.description || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save holiday.');
      }

      toast.success(
        holidayId
          ? 'Holiday updated successfully.'
          : 'Holiday created successfully.'
      );
      close();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save holiday. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {holidayId ? 'Edit Holiday' : 'Add Public Holiday'}
          </DialogTitle>
          <DialogDescription>
            {holidayId
              ? 'Update holiday information.'
              : 'Add a new public holiday for the selected year.'}
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-6'>
            <div className='space-y-4'>
              <FormInput
                name='category'
                label='Category'
                placeholder='e.g., Shivratri, Dashain, Tihar'
                required
                control={form.control}
              />
              <FormSelect
                name='year'
                label='Year'
                options={yearOptions}
                required
                control={form.control}
                placeholder='Select year'
              />
              <FormSwitch
                name='isRecurring'
                label='Recurring Holiday'
                description='If checked, this holiday will apply every year'
                control={form.control}
              />
              <FormDatePicker
                name='date'
                label='Date'
                required
                control={form.control}
                config={{
                  minDate: new Date(),
                  placeholder: 'Select holiday date'
                }}
              />
              <FormTextarea
                name='description'
                label='Description (Optional)'
                placeholder='Add any additional notes about this holiday...'
                config={{ rows: 3 }}
                control={form.control}
              />
            </div>
            <DialogFooter className='mt-6'>
              <Button type='button' variant='outline' onClick={close}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading}>
                {loading
                  ? 'Saving...'
                  : holidayId
                    ? 'Update Holiday'
                    : 'Create Holiday'}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
