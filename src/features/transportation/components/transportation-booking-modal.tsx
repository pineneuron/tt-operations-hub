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
import { useTransportationBookingModal } from '@/features/transportation/hooks/use-transportation-booking-modal';
import {
  TRANSPORTATION_STATUS_OPTIONS,
  TRANSPORTATION_TYPE_OPTIONS
} from '@/features/transportation/components/transportation-tables/options';
import { Separator } from '@/components/ui/separator';

const bookingFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().or(z.literal('')),
    type: z.enum(['PICKUP', 'DROPOFF', 'ROUND_TRIP', 'DELIVERY']),
    status: z
      .enum(['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'])
      .default('PENDING'),
    pickupLocation: z.string().min(1, 'Pickup location is required'),
    pickupDate: z.date(),
    pickupTime: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
      .optional()
      .or(z.literal('')),
    pickupContactName: z.string().optional().or(z.literal('')),
    pickupContactPhone: z.string().optional().or(z.literal('')),
    dropoffLocation: z.string().min(1, 'Dropoff location is required'),
    dropoffDate: z.date().optional().nullable(),
    dropoffTime: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
      .optional()
      .or(z.literal('')),
    dropoffContactName: z.string().optional().or(z.literal('')),
    dropoffContactPhone: z.string().optional().or(z.literal('')),
    vendorSupplierId: z.string().optional().nullable(),
    entryId: z.string().optional().nullable()
  })
  .refine(
    (data) => {
      const now = new Date();
      now.setSeconds(0, 0);

      const pickupDateTime = new Date(data.pickupDate);
      if (data.pickupTime) {
        const [hours, minutes] = data.pickupTime.split(':').map(Number);
        pickupDateTime.setHours(hours, minutes, 0, 0);
      } else {
        pickupDateTime.setHours(0, 0, 0, 0);
      }

      return pickupDateTime >= now;
    },
    {
      message: 'Pickup date and time cannot be in the past.',
      path: ['pickupDate']
    }
  )
  .refine(
    (data) => {
      if (!data.dropoffDate) return true;

      const pickupDateTime = new Date(data.pickupDate);
      if (data.pickupTime) {
        const [hours, minutes] = data.pickupTime.split(':').map(Number);
        pickupDateTime.setHours(hours, minutes, 0, 0);
      }

      const dropoffDateTime = new Date(data.dropoffDate);
      if (data.dropoffTime) {
        const [hours, minutes] = data.dropoffTime.split(':').map(Number);
        dropoffDateTime.setHours(hours, minutes, 0, 0);
      } else {
        dropoffDateTime.setHours(23, 59, 59, 999);
      }

      return dropoffDateTime >= pickupDateTime;
    },
    {
      message: 'Dropoff date and time must be after pickup date and time.',
      path: ['dropoffDate']
    }
  );

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const formatTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export function TransportationBookingModal() {
  const router = useRouter();
  const { isOpen, bookingId, closeModal } = useTransportationBookingModal();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'PICKUP',
      status: 'PENDING',
      pickupLocation: '',
      pickupDate: new Date(),
      pickupTime: '',
      pickupContactName: '',
      pickupContactPhone: '',
      dropoffLocation: '',
      dropoffDate: null,
      dropoffTime: '',
      dropoffContactName: '',
      dropoffContactPhone: '',
      vendorSupplierId: null,
      entryId: null
    }
  });

  // Auto-sync dropoff date with pickup date
  const pickupDate = form.watch('pickupDate');
  useEffect(() => {
    if (pickupDate && !form.getValues('dropoffDate')) {
      form.setValue('dropoffDate', pickupDate);
    }
  }, [pickupDate, form]);

  // Fetch booking data for editing
  useEffect(() => {
    if (isOpen && bookingId) {
      setIsFetching(true);
      fetch(`/api/transportation/bookings/${bookingId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.booking) {
            const booking = data.booking;
            const pickupDate = new Date(booking.pickupDate);
            const pickupTime = booking.pickupTime
              ? new Date(booking.pickupTime)
              : null;
            const dropoffDate = booking.dropoffDate
              ? new Date(booking.dropoffDate)
              : null;
            const dropoffTime = booking.dropoffTime
              ? new Date(booking.dropoffTime)
              : null;

            form.reset({
              title: booking.title,
              description: booking.description || '',
              type: booking.type,
              status: booking.status,
              pickupLocation: booking.pickupLocation,
              pickupDate: pickupDate,
              pickupTime: pickupTime ? formatTime(pickupTime) : '',
              pickupContactName: booking.pickupContactName || '',
              pickupContactPhone: booking.pickupContactPhone || '',
              dropoffLocation: booking.dropoffLocation,
              dropoffDate: dropoffDate,
              dropoffTime: dropoffTime ? formatTime(dropoffTime) : '',
              dropoffContactName: booking.dropoffContactName || '',
              dropoffContactPhone: booking.dropoffContactPhone || '',
              vendorSupplierId: booking.vendorSupplierId || null,
              entryId: booking.entry?.id || null
            });
          }
        })
        .catch((error) => {
          console.error('Failed to fetch booking:', error);
          toast.error('Failed to load booking data');
        })
        .finally(() => {
          setIsFetching(false);
        });
    } else if (isOpen && !bookingId) {
      // Reset form for new booking
      const now = new Date();
      form.reset({
        title: '',
        description: '',
        type: 'PICKUP',
        status: 'PENDING',
        pickupLocation: '',
        pickupDate: now,
        pickupTime: '',
        pickupContactName: '',
        pickupContactPhone: '',
        dropoffLocation: '',
        dropoffDate: now,
        dropoffTime: '',
        dropoffContactName: '',
        dropoffContactPhone: '',
        vendorSupplierId: null
      });
    }
  }, [isOpen, bookingId, form]);

  const onSubmit = async (values: BookingFormValues) => {
    setLoading(true);
    try {
      const pickupDateTime = new Date(values.pickupDate);
      if (values.pickupTime) {
        const [hours, minutes] = values.pickupTime.split(':').map(Number);
        pickupDateTime.setHours(hours, minutes, 0, 0);
      }

      const dropoffDateTime = values.dropoffDate
        ? new Date(values.dropoffDate)
        : null;
      if (dropoffDateTime && values.dropoffTime) {
        const [hours, minutes] = values.dropoffTime.split(':').map(Number);
        dropoffDateTime.setHours(hours, minutes, 0, 0);
      }

      const payload = {
        title: values.title,
        description: values.description || null,
        type: values.type,
        status: values.status,
        pickupLocation: values.pickupLocation,
        pickupDate: pickupDateTime.toISOString(),
        pickupTime: values.pickupTime ? pickupDateTime.toISOString() : null,
        pickupContactName: values.pickupContactName || null,
        pickupContactPhone: values.pickupContactPhone || null,
        dropoffLocation: values.dropoffLocation,
        dropoffDate: dropoffDateTime?.toISOString() || null,
        dropoffTime:
          dropoffDateTime && values.dropoffTime
            ? dropoffDateTime.toISOString()
            : null,
        dropoffContactName: values.dropoffContactName || null,
        dropoffContactPhone: values.dropoffContactPhone || null,
        vendorSupplierId: values.vendorSupplierId || null,
        entryId: values.entryId || null
      };

      const url = bookingId
        ? `/api/transportation/bookings/${bookingId}`
        : '/api/transportation/bookings';
      const method = bookingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save booking');
      }

      toast.success(
        bookingId
          ? 'Booking updated successfully'
          : 'Booking created successfully'
      );
      closeModal();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {bookingId ? 'Edit Booking' : 'Create Transportation Booking'}
          </DialogTitle>
          <DialogDescription>
            {bookingId
              ? 'Update transportation booking details'
              : 'Create a new transportation booking and assign it to a vendor/supplier'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit}>
          <div className='space-y-6'>
            <FormInput
              control={form.control}
              name='title'
              label='Title'
              required
              placeholder='e.g., Equipment pickup from warehouse'
            />

            <FormTextarea
              control={form.control}
              name='description'
              label='Description'
              placeholder='Additional details or requirements...'
            />

            <FormAutocomplete
              control={form.control}
              name='vendorSupplierId'
              label='Vendor/Supplier'
              placeholder='Search and select vendor/supplier...'
              searchEndpoint='/api/users/search?role=VENDOR_SUPPLIER'
            />

            <FormAutocomplete
              control={form.control}
              name='entryId'
              label='Entry'
              placeholder='Search and select entry...'
              searchEndpoint={
                bookingId
                  ? `/api/transportation/entries/search?currentBookingId=${bookingId}`
                  : '/api/transportation/entries/search'
              }
            />

            <FormSelect
              control={form.control}
              name='type'
              label='Type'
              required
              options={TRANSPORTATION_TYPE_OPTIONS}
            />

            <div className='space-y-4'>
              <h3 className='text-sm font-medium'>Pickup Details</h3>
              <FormInput
                control={form.control}
                name='pickupLocation'
                label='Pickup Location'
                required
                placeholder='e.g., Hotel Makalu'
              />

              <div className='grid gap-4 md:grid-cols-2'>
                <FormDatePicker
                  control={form.control}
                  name='pickupDate'
                  label='Pickup Date'
                  required
                />

                <FormTimePicker
                  control={form.control}
                  name='pickupTime'
                  label='Pickup Time'
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <FormInput
                  control={form.control}
                  name='pickupContactName'
                  label='Pickup Contact Name'
                  placeholder='Contact person name'
                />

                <FormInput
                  control={form.control}
                  name='pickupContactPhone'
                  label='Pickup Contact Phone'
                  placeholder='Phone number'
                />
              </div>
            </div>

            <Separator />

            <div className='space-y-4'>
              <h3 className='text-sm font-medium'>Dropoff Details</h3>
              <FormInput
                control={form.control}
                name='dropoffLocation'
                label='Dropoff Location'
                required
                placeholder='e.g., Event Venue'
              />

              <div className='grid gap-4 md:grid-cols-2'>
                <FormDatePicker
                  control={form.control}
                  name='dropoffDate'
                  label='Dropoff Date'
                />

                <FormTimePicker
                  control={form.control}
                  name='dropoffTime'
                  label='Dropoff Time'
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <FormInput
                  control={form.control}
                  name='dropoffContactName'
                  label='Dropoff Contact Name'
                  placeholder='Contact person name'
                />

                <FormInput
                  control={form.control}
                  name='dropoffContactPhone'
                  label='Dropoff Contact Phone'
                  placeholder='Phone number'
                />
              </div>
            </div>

            <Separator />

            <FormSelect
              control={form.control}
              name='status'
              label='Status'
              required
              options={TRANSPORTATION_STATUS_OPTIONS}
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
                    : bookingId
                      ? 'Update Booking'
                      : 'Create Booking'}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
