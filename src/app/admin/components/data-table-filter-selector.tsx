
"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableDateRangeFilter } from "./data-table-date-range-filter";
import { Input } from "@/components/ui/input";
import { X } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

interface DataTableFilterSelectorProps<TData> {
    table: Table<TData>;
    searchableColumns?: { id: string, placeholder: string }[];
    filterableColumns?: { id: string, title: string, options: { label: string, value: string, icon?: React.ComponentType<{ className?: string }> }[] }[];
    dateRangeColumns?: { id: string }[];
}

export function DataTableFilterSelector<TData>({
    table,
    searchableColumns = [],
    filterableColumns = [],
    dateRangeColumns = [],
}: DataTableFilterSelectorProps<TData>) {
    const [open, setOpen] = React.useState(false);
    const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) {
            setSelectedColumnId(null);
        }
    }, [open]);

    const handleApply = () => {
        setOpen(false);
    };

    const allColumns = React.useMemo(() => 
        [...searchableColumns, ...filterableColumns, ...dateRangeColumns],
        [searchableColumns, filterableColumns, dateRangeColumns]
    );

    const activeFilters = table.getState().columnFilters;
    const activeColumns = allColumns.filter(c => activeFilters.some(f => f.id === c.id));
    const inactiveColumns = allColumns.filter(c => !activeFilters.some(f => f.id === c.id));

    const renderFilter = () => {
        if (!selectedColumnId) return null;

        const searchable = searchableColumns.find(c => c.id === selectedColumnId);
        if (searchable) {
            return (
                <div className="space-y-2">
                    <Input
                        placeholder={searchable.placeholder}
                        value={(table.getColumn(searchable.id)?.getFilterValue() as string) ?? ''}
                        onChange={(event) =>
                            table.getColumn(searchable.id)?.setFilterValue(event.target.value)
                        }
                        className="h-8 w-full"
                    />
                    <Separator />
                    <div className="flex justify-end">
                        <Button onClick={handleApply}>Apply</Button>
                    </div>
                </div>
            );
        }

        const filterable = filterableColumns.find(c => c.id === selectedColumnId);
        if (filterable) {
            return (
                <DataTableFacetedFilter
                    column={table.getColumn(filterable.id)}
                    title={filterable.title}
                    options={filterable.options}
                />
            );
        }

        const dateRange = dateRangeColumns.find(c => c.id === selectedColumnId);
        if (dateRange) {
            return (
                <DataTableDateRangeFilter
                    table={table}
                    columnId={dateRange.id}
                    onApply={handleApply}
                />
            );
        }

        return null;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <PlusCircledIcon className="mr-2 h-4 w-4" />
                    Filter
                    {activeColumns.length > 0 && <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{activeColumns.length}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                {selectedColumnId ? (
                    <div className="p-4">
                        <h4 className="text-sm font-semibold mb-2">{table.getColumn(selectedColumnId)?.columnDef.meta?.displayName || selectedColumnId}</h4>
                        {renderFilter()}
                    </div>
                ) : (
                    <Command>
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {activeColumns.length > 0 && (
                                <CommandGroup heading="Active Filters">
                                    {activeColumns.map((column) => (
                                        <CommandItem
                                            key={column.id}
                                            onSelect={() => setSelectedColumnId(column.id)}
                                            className="justify-between"
                                        >
                                            <span>{table.getColumn(column.id)?.columnDef.meta?.displayName || column.id}</span>
                                            <div
                                                role="button"
                                                aria-label="Remove filter"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    table.getColumn(column.id)?.setFilterValue(undefined);
                                                }}
                                                className="p-1 rounded-full hover:bg-accent"
                                            >
                                                <X className="h-4 w-4" />
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                            {activeColumns.length > 0 && inactiveColumns.length > 0 && <CommandSeparator />}
                            {inactiveColumns.length > 0 && (
                                <CommandGroup heading="Filter by">
                                    {inactiveColumns.map((column) => (
                                        <CommandItem
                                            key={column.id}
                                            onSelect={() => setSelectedColumnId(column.id)}
                                        >
                                            {table.getColumn(column.id)?.columnDef.meta?.displayName || column.id}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                )}
            </PopoverContent>
        </Popover>
    );
}
