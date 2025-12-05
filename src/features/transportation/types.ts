import {
  TransportationStatus,
  TransportationType,
  DeliveryStatus
} from '@prisma/client';

export interface TransportationBookingListItem {
  id: string;
  title: string;
  description: string | null;
  type: TransportationType;
  status: TransportationStatus;
  pickupLocation: string;
  pickupDate: string;
  dropoffLocation: string;
  dropoffDate: string | null;
  vendorSupplierId: string | null;
  vendorSupplierName: string | null;
  vendorSupplierEmail: string | null;
  createdById: string;
  createdByName: string | null;
  createdByEmail: string;
  hasEntry: boolean; // Whether an entry is linked
  createdAt: string;
  updatedAt: string;
}

export interface TransportationEntryListItem {
  id: string;
  bookingId: string | null;
  bookingTitle: string | null;
  type: TransportationType;
  deliveryStatus: DeliveryStatus | null;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string | null;
  actualPickupLocation: string;
  actualPickupDate: string;
  actualDropoffLocation: string;
  actualDropoffDate: string | null;
  createdById: string;
  createdByName: string | null;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportationBookingFormValues {
  title: string;
  description: string;
  type: TransportationType;
  status: TransportationStatus;
  pickupLocation: string;
  pickupDate: Date;
  pickupTime: Date | null;
  pickupContactName: string;
  pickupContactPhone: string;
  dropoffLocation: string;
  dropoffDate: Date | null;
  dropoffTime: Date | null;
  dropoffContactName: string;
  dropoffContactPhone: string;
  vendorSupplierId: string | null;
  entryId: string | null;
}

export interface TransportationEntryFormValues {
  bookingId: string | null;
  type: TransportationType;
  deliveryStatus: DeliveryStatus | null;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  actualPickupLocation: string;
  actualPickupDate: Date;
  actualPickupTime: Date | null;
  actualDropoffLocation: string;
  actualDropoffDate: Date | null;
  actualDropoffTime: Date | null;
  notes: string;
}
