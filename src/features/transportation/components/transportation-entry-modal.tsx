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
import { FormDatePicker } from '@/components/forms/form-date-picker';
import { FormTimePicker } from '@/components/forms/form-time-picker';
import { FormSelect } from '@/components/forms/form-select';
import { FormAutocomplete } from '@/components/forms/form-autocomplete';
import { Button } from '@/components/ui/button';
import { useTransportationEntryModal } from '@/features/transportation/hooks/use-transportation-entry-modal';
import {
  TRANSPORTATION_TYPE_OPTIONS,
  DELIVERY_STATUS_OPTIONS
} from '@/features/transportation/components/transportation-tables/options';
import { Separator } from '@/components/ui/separator';

const entryFormSchema = z
  .object({
    type: z.enum(['PICKUP', 'DROPOFF', 'ROUND_TRIP', 'DELIVERY']),
    deliveryStatus: z
      .enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED'])
      .optional()
      .nullable(),
    vehicleNumber: z.string().min(1, 'Vehicle number is required'),
    driverName: z.string().min(1, 'Driver name is required'),
    driverPhone: z.string().optional().or(z.literal('')),
    actualPickupLocation: z.string().optional().or(z.literal('')),
    actualPickupDate: z.date().optional(),
    actualPickupTime: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
      .optional()
      .or(z.literal('')),
    actualDropoffLocation: z.string().optional().or(z.literal('')),
    actualDropoffDate: z.date().optional().nullable(),
    actualDropoffTime: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
      .optional()
      .or(z.literal('')),
    notes: z.string().optional().or(z.literal(''))
  })
  .refine(
    (data) => {
      // PICKUP and ROUND_TRIP require pickup location and date
      if (data.type === 'PICKUP' || data.type === 'ROUND_TRIP') {
        if (
          !data.actualPickupLocation ||
          data.actualPickupLocation.trim() === ''
        ) {
          return false;
        }
        if (!data.actualPickupDate) {
          return false;
        }
      }
      // DROPOFF, ROUND_TRIP, and DELIVERY require dropoff location
      if (
        data.type === 'DROPOFF' ||
        data.type === 'ROUND_TRIP' ||
        data.type === 'DELIVERY'
      ) {
        if (
          !data.actualDropoffLocation ||
          data.actualDropoffLocation.trim() === ''
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Location and date are required for this type.',
      path: ['actualPickupLocation']
    }
  )
  .refine(
    (data) => {
      // Only validate dates if pickup is required
      if (
        (data.type === 'PICKUP' || data.type === 'ROUND_TRIP') &&
        data.actualPickupDate
      ) {
        const now = new Date();
        now.setSeconds(0, 0);

        const pickupDateTime = new Date(data.actualPickupDate);
        if (data.actualPickupTime) {
          const [hours, minutes] = data.actualPickupTime.split(':').map(Number);
          pickupDateTime.setHours(hours, minutes, 0, 0);
        } else {
          pickupDateTime.setHours(0, 0, 0, 0);
        }

        return pickupDateTime >= now;
      }
      return true;
    },
    {
      message: 'Pickup date and time cannot be in the past.',
      path: ['actualPickupDate']
    }
  )
  .refine(
    (data) => {
      // Only validate if both dates exist
      if (!data.actualDropoffDate || !data.actualPickupDate) return true;

      const pickupDateTime = new Date(data.actualPickupDate);
      if (data.actualPickupTime) {
        const [hours, minutes] = data.actualPickupTime.split(':').map(Number);
        pickupDateTime.setHours(hours, minutes, 0, 0);
      } else {
        pickupDateTime.setHours(0, 0, 0, 0);
      }

      const dropoffDateTime = new Date(data.actualDropoffDate);
      if (data.actualDropoffTime) {
        const [hours, minutes] = data.actualDropoffTime.split(':').map(Number);
        dropoffDateTime.setHours(hours, minutes, 0, 0);
      } else {
        dropoffDateTime.setHours(23, 59, 59, 999);
      }

      return dropoffDateTime >= pickupDateTime;
    },
    {
      message: 'Dropoff date and time must be after pickup date and time.',
      path: ['actualDropoffDate']
    }
  );

type EntryFormValues = z.infer<typeof entryFormSchema>;

const formatTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export function TransportationEntryModal() {
  const router = useRouter();
  const { isOpen, entryId, closeModal } = useTransportationEntryModal();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      type: 'PICKUP',
      deliveryStatus: null,
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      actualPickupLocation: '',
      actualPickupDate: new Date(),
      actualPickupTime: '',
      actualDropoffLocation: '',
      actualDropoffDate: null,
      actualDropoffTime: '',
      notes: ''
    }
  });

  const entryType = form.watch('type');

  // Set default dates when type changes
  useEffect(() => {
    if (entryType === 'PICKUP' || entryType === 'ROUND_TRIP') {
      if (!form.getValues('actualPickupDate')) {
        form.setValue('actualPickupDate', new Date());
      }
    }
    if (
      entryType === 'DROPOFF' ||
      entryType === 'ROUND_TRIP' ||
      entryType === 'DELIVERY'
    ) {
      if (!form.getValues('actualDropoffDate')) {
        const pickupDate = form.getValues('actualPickupDate');
        form.setValue('actualDropoffDate', pickupDate || new Date());
      }
    }
  }, [entryType, form]);

  // Auto-sync dropoff date with pickup date
  const pickupDate = form.watch('actualPickupDate');
  useEffect(() => {
    if (
      pickupDate &&
      (entryType === 'ROUND_TRIP' || entryType === 'DELIVERY')
    ) {
      if (!form.getValues('actualDropoffDate')) {
        form.setValue('actualDropoffDate', pickupDate);
      }
    }
  }, [pickupDate, entryType, form]);

  // Fetch entry data for editing
  useEffect(() => {
    if (isOpen && entryId) {
      setIsFetching(true);
      fetch(`/api/transportation/entries/${entryId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.entry) {
            const entry = data.entry;
            form.reset({
              type: entry.type,
              deliveryStatus: entry.deliveryStatus || null,
              vehicleNumber: entry.vehicleNumber,
              driverName: entry.driverName,
              driverPhone: entry.driverPhone || '',
              actualPickupLocation: entry.actualPickupLocation || '',
              actualPickupDate: entry.actualPickupDate
                ? new Date(entry.actualPickupDate)
                : new Date(),
              actualPickupTime: entry.actualPickupTime
                ? formatTime(new Date(entry.actualPickupTime))
                : '',
              actualDropoffLocation: entry.actualDropoffLocation || '',
              actualDropoffDate: entry.actualDropoffDate
                ? new Date(entry.actualDropoffDate)
                : null,
              actualDropoffTime: entry.actualDropoffTime
                ? formatTime(new Date(entry.actualDropoffTime))
                : '',
              notes: entry.notes || ''
            });
          }
        })
        .catch((error) => {
          console.error('Failed to fetch entry:', error);
          toast.error('Failed to load entry data');
        })
        .finally(() => {
          setIsFetching(false);
        });
    } else if (isOpen && !entryId) {
      // Reset form for new entry
      const now = new Date();
      form.reset({
        type: 'PICKUP',
        deliveryStatus: null,
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        actualPickupLocation: '',
        actualPickupDate: undefined,
        actualPickupTime: '',
        actualDropoffLocation: '',
        actualDropoffDate: null,
        actualDropoffTime: '',
        notes: ''
      });
    }
  }, [isOpen, entryId, form]);

  const onSubmit = async (values: EntryFormValues) => {
    setLoading(true);
    try {
      // Handle pickup date/time
      let pickupDateTime: Date | null = null;
      if (values.actualPickupDate) {
        pickupDateTime = new Date(values.actualPickupDate);
        if (values.actualPickupTime) {
          const [hours, minutes] = values.actualPickupTime
            .split(':')
            .map(Number);
          pickupDateTime.setHours(hours, minutes, 0, 0);
        } else {
          pickupDateTime.setHours(0, 0, 0, 0);
        }
      }

      // Handle dropoff date/time
      let dropoffDateTime: Date | null = null;
      if (values.actualDropoffDate) {
        dropoffDateTime = new Date(values.actualDropoffDate);
        if (values.actualDropoffTime) {
          const [hours, minutes] = values.actualDropoffTime
            .split(':')
            .map(Number);
          dropoffDateTime.setHours(hours, minutes, 0, 0);
        } else {
          dropoffDateTime.setHours(23, 59, 59, 999);
        }
      }

      const payload = {
        bookingId: null,
        type: values.type,
        deliveryStatus: values.deliveryStatus || null,
        vehicleNumber: values.vehicleNumber,
        driverName: values.driverName,
        driverPhone: values.driverPhone || null,
        actualPickupLocation: values.actualPickupLocation || '',
        actualPickupDate:
          pickupDateTime?.toISOString() || new Date().toISOString(),
        actualPickupTime:
          pickupDateTime && values.actualPickupTime
            ? pickupDateTime.toISOString()
            : null,
        actualDropoffLocation: values.actualDropoffLocation || '',
        actualDropoffDate: dropoffDateTime?.toISOString() || null,
        actualDropoffTime:
          dropoffDateTime && values.actualDropoffTime
            ? dropoffDateTime.toISOString()
            : null,
        notes: values.notes || null
      };

      const url = entryId
        ? `/api/transportation/entries/${entryId}`
        : '/api/transportation/entries';
      const method = entryId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save entry');
      }

      toast.success(
        entryId ? 'Entry updated successfully' : 'Entry created successfully'
      );
      closeModal();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {entryId ? 'Edit Entry' : 'Create Transportation Entry'}
          </DialogTitle>
          <DialogDescription>
            {entryId
              ? 'Update transportation entry details'
              : 'Record vehicle trip details. You can link this to a booking or create a standalone entry.'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit}>
          <div className='space-y-6'>
            <FormSelect
              control={form.control}
              name='type'
              label='Type'
              required
              options={TRANSPORTATION_TYPE_OPTIONS}
            />

            {entryType === 'DELIVERY' && (
              <FormSelect
                control={form.control}
                name='deliveryStatus'
                label='Delivery Status'
                options={DELIVERY_STATUS_OPTIONS}
              />
            )}

            <div className='space-y-4'>
              <h3 className='text-sm font-medium'>Vehicle & Driver Details</h3>
              <div className='grid gap-4 md:grid-cols-2'>
                <FormInput
                  control={form.control}
                  name='vehicleNumber'
                  label='Vehicle Number'
                  required
                  placeholder='e.g., BA-1234'
                />

                <FormInput
                  control={form.control}
                  name='driverName'
                  label='Driver Name'
                  required
                  placeholder='Driver full name'
                />
              </div>

              <FormInput
                control={form.control}
                name='driverPhone'
                label='Driver Phone'
                placeholder='Phone number'
              />
            </div>

            {(entryType === 'PICKUP' || entryType === 'ROUND_TRIP') && (
              <>
                <Separator />
                <div className='space-y-4'>
                  <h3 className='text-sm font-medium'>Pickup Details</h3>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <FormInput
                      control={form.control}
                      name='actualPickupLocation'
                      label='Pickup Location'
                      required
                      placeholder='e.g., Warehouse A'
                    />

                    <FormDatePicker
                      control={form.control}
                      name='actualPickupDate'
                      label='Pickup Date'
                      required
                    />
                  </div>

                  <FormTimePicker
                    control={form.control}
                    name='actualPickupTime'
                    label='Pickup Time'
                  />
                </div>
              </>
            )}

            {(entryType === 'DROPOFF' ||
              entryType === 'ROUND_TRIP' ||
              entryType === 'DELIVERY') && (
              <>
                <Separator />
                <div className='space-y-4'>
                  <h3 className='text-sm font-medium'>Dropoff Details</h3>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <FormInput
                      control={form.control}
                      name='actualDropoffLocation'
                      label='Dropoff Location'
                      required
                      placeholder='e.g., Event Venue'
                    />

                    <FormDatePicker
                      control={form.control}
                      name='actualDropoffDate'
                      label='Dropoff Date'
                    />
                  </div>

                  <FormTimePicker
                    control={form.control}
                    name='actualDropoffTime'
                    label='Dropoff Time'
                  />
                </div>
              </>
            )}

            <Separator />

            <FormTextarea
              control={form.control}
              name='notes'
              label='Notes'
              placeholder='Additional notes or remarks...'
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={closeModal}
                disabled={loading || isFetching}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={loading || isFetching}>
                {loading
                  ? 'Saving...'
                  : isFetching
                    ? 'Loading...'
                    : entryId
                      ? 'Update Entry'
                      : 'Create Entry'}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
