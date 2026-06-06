'use client';

import type { DatagridFilterDto } from '@open-meet/types';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

export interface FilterProps {
  filter: DatagridFilterDto;
  value: string;
  onChange: (value: string) => void;
}

const ALL_VALUE = '__all';

export function Filter({ filter, value, onChange }: FilterProps) {
  const options =
    filter.type === 'boolean'
      ? [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]
      : (filter.options ?? []);

  return (
    <Select value={value || ALL_VALUE} onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}>
      <SelectTrigger className="h-9 w-44">
        <SelectValue placeholder={filter.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{filter.label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
