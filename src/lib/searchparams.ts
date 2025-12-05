import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const searchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(20),
  name: parseAsString,
  gender: parseAsString,
  category: parseAsString,
  role: parseAsString,
  leaveType: parseAsString,
  status: parseAsString,
  datePreset: parseAsString,
  dateFrom: parseAsString,
  dateTo: parseAsString,
  year: parseAsString,
  isRecurring: parseAsString,
  workLocation: parseAsString,
  search: parseAsString,
  clientId: parseAsString,
  type: parseAsString, // upcoming | past
  filterType: parseAsString, // upcoming | past | today (for meetings)
  eventId: parseAsString,
  assigneeId: parseAsString
  // advanced filter
  // filters: getFiltersStateParser().withDefault([]),
  // joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and')
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
