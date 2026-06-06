'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { DatagridQuery, DatagridResponseDto, DatagridSortDir } from '@open-meet/types';

import { datagridApi } from '@/features/datagrid/services/datagrid';

export interface DatagridState {
  data: DatagridResponseDto | undefined;
  isLoading: boolean;
  isFetching: boolean;
  query: DatagridQuery;
  page: number;
  search: string;
  filters: Record<string, string>;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  setFilter: (key: string, value: string) => void;
  toggleSort: (key: string) => void;
}

const PAGE_SIZE = 20;

export function useDatagrid(resource: string): DatagridState {
  const [page, setPage] = useState(1);
  const [search, setSearchValue] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: DatagridSortDir } | null>(null);

  const query: DatagridQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(sort ? { sort: sort.key, dir: sort.dir } : {}),
    ...filters,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-datagrid', resource, query],
    queryFn: ({ signal }) => datagridApi.fetch<Record<string, unknown>>(resource, query, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const setSearch = (value: string) => {
    setSearchValue(value);
    setPage(1);
  };

  const setFilter = (key: string, value: string) => {
    setFilters((current) => {
      const next = { ...current };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
    setPage(1);
  };

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) {
        return { key, dir: 'asc' };
      }
      return current.dir === 'asc' ? { key, dir: 'desc' } : null;
    });
    setPage(1);
  };

  return {
    data,
    isLoading,
    isFetching,
    query,
    page,
    search,
    filters,
    setSearch,
    setPage,
    setFilter,
    toggleSort,
  };
}
