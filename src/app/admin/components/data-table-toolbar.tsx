
'use client';

import { Table } from '@tanstack/react-table';

import { DataTableViewOptions } from './data-table-view-options';
import { DataTableFilterSelector } from "./data-table-filter-selector";

export interface SearchableColumn {
  id: string;
  placeholder: string;
}

export interface FilterableColumn<TData> {
  id: string;
  title: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export interface DateRangeColumn {
    id: string;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchableColumns?: SearchableColumn[];
  filterableColumns?: FilterableColumn<TData>[];
  dateRangeColumns?: DateRangeColumn[];
}

export function DataTableToolbar<TData>({
  table,
  searchableColumns = [],
  filterableColumns = [],
  dateRangeColumns = [],
}: DataTableToolbarProps<TData>) {

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <DataTableFilterSelector 
          table={table} 
          searchableColumns={searchableColumns}
          filterableColumns={filterableColumns}
          dateRangeColumns={dateRangeColumns}
        />
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
