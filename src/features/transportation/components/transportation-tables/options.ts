import {
  TransportationStatus,
  TransportationType,
  DeliveryStatus
} from '@prisma/client';

export const TRANSPORTATION_STATUS_OPTIONS = [
  { value: TransportationStatus.PENDING, label: 'Pending' },
  { value: TransportationStatus.CONFIRMED, label: 'Confirmed' },
  { value: TransportationStatus.IN_TRANSIT, label: 'In Transit' },
  { value: TransportationStatus.COMPLETED, label: 'Completed' },
  { value: TransportationStatus.CANCELLED, label: 'Cancelled' }
];

export const TRANSPORTATION_TYPE_OPTIONS = [
  { value: TransportationType.PICKUP, label: 'Pickup' },
  { value: TransportationType.DROPOFF, label: 'Dropoff' },
  { value: TransportationType.ROUND_TRIP, label: 'Round Trip' },
  { value: TransportationType.DELIVERY, label: 'Delivery' }
];

export const DELIVERY_STATUS_OPTIONS = [
  { value: DeliveryStatus.PENDING, label: 'Pending' },
  { value: DeliveryStatus.IN_TRANSIT, label: 'In Transit' },
  { value: DeliveryStatus.DELIVERED, label: 'Delivered' },
  { value: DeliveryStatus.FAILED, label: 'Failed' }
];
