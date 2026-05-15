import { ParsedQs } from 'qs';
import {
  getOptionalBooleanQuery,
  getOptionalDateQuery,
  getOptionalNumberQuery,
  getPaginationQuery,
  getSortOrderQuery,
  getStringQuery
} from './listQuery';

export const parseRoomListQuery = (query: ParsedQs) => ({
  q: getStringQuery(query, 'q'),
  location: getStringQuery(query, 'location'),
  minCapacity: getOptionalNumberQuery(query, 'minCapacity'),
  maxCapacity: getOptionalNumberQuery(query, 'maxCapacity'),
  sortBy: getStringQuery(query, 'sortBy'),
  sortOrder: getSortOrderQuery(query),
  pagination: getPaginationQuery(query)
});

export const parseWorkshopListQuery = (query: ParsedQs) => ({
  q: getStringQuery(query, 'q'),
  roomId: getStringQuery(query, 'roomId'),
  minPrice: getOptionalNumberQuery(query, 'minPrice'),
  maxPrice: getOptionalNumberQuery(query, 'maxPrice'),
  startsFrom: getOptionalDateQuery(query, 'startsFrom'),
  startsTo: getOptionalDateQuery(query, 'startsTo'),
  hasSeats: getOptionalBooleanQuery(query, 'hasSeats'),
  sortBy: getStringQuery(query, 'sortBy'),
  sortOrder: getSortOrderQuery(query),
  pagination: getPaginationQuery(query)
});
