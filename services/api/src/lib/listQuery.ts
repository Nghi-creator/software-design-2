import { ParsedQs } from 'qs';

export type SortOrder = 'asc' | 'desc';

export type Pagination = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const firstValue = (value: string | ParsedQs | (string | ParsedQs)[] | undefined) => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
};

export const getStringQuery = (
  query: ParsedQs,
  key: string
) => firstValue(query[key]);

export const getOptionalNumberQuery = (
  query: ParsedQs,
  key: string
) => {
  const value = getStringQuery(query, key);

  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${key} must be a number`);
  }

  return numberValue;
};

export const getOptionalDateQuery = (
  query: ParsedQs,
  key: string
) => {
  const value = getStringQuery(query, key);

  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    throw new Error(`${key} must be a valid date`);
  }

  return dateValue;
};

export const getOptionalBooleanQuery = (
  query: ParsedQs,
  key: string
) => {
  const value = getStringQuery(query, key);

  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${key} must be true or false`);
};

export const getSortOrderQuery = (query: ParsedQs): SortOrder => {
  const sortOrder = getStringQuery(query, 'sortOrder')?.toLowerCase();

  if (sortOrder === undefined) {
    return 'asc';
  }

  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    throw new Error('sortOrder must be asc or desc');
  }

  return sortOrder;
};

export const getPaginationQuery = (query: ParsedQs): Pagination => {
  const page = getPositiveIntegerQuery(query, 'page', DEFAULT_PAGE);
  const pageSize = getPositiveIntegerQuery(query, 'pageSize', DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new Error(`pageSize must be less than or equal to ${MAX_PAGE_SIZE}`);
  }

  return { page, pageSize };
};

const getPositiveIntegerQuery = (
  query: ParsedQs,
  key: string,
  defaultValue: number
) => {
  const value = getStringQuery(query, key);

  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new Error(`${key} must be a positive integer`);
  }

  return numberValue;
};

export const toPaginatedResult = <T>(
  items: T[],
  totalItems: number,
  pagination: Pagination
): PaginatedResult<T> => ({
  items,
  pagination: {
    ...pagination,
    totalItems,
    totalPages: Math.ceil(totalItems / pagination.pageSize)
  }
});
