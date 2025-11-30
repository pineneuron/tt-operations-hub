export interface HolidayListItem {
  id: string;
  category: string;
  nameNepali: string | null;
  date: string;
  year: number;
  isRecurring: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
