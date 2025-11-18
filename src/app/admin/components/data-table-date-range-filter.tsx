
import * as React from 'react';
import { Table } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';

interface DataTableDateRangeFilterProps<TData> {
    table: Table<TData>;
    columnId: string;
    onApply?: () => void; // Callback to close the parent popover
}

export function DataTableDateRangeFilter<TData>({ table, columnId, onApply }: DataTableDateRangeFilterProps<TData>) {
    const column = table.getColumn(columnId);
    const currentFilter = column?.getFilterValue() as DateRange | undefined;

    const [date, setDate] = React.useState<DateRange | undefined>(currentFilter);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (currentFilter === undefined) {
            setDate(undefined);
        }
    }, [currentFilter]);

    const applyFilter = (newDate: DateRange | undefined) => {
        if (newDate?.to) {
            newDate.to.setHours(23, 59, 59, 999);
        } else if (newDate?.from && !newDate.to) {
            newDate.to = new Date(newDate.from);
            newDate.to.setHours(23, 59, 59, 999);
        }
        column?.setFilterValue(newDate);
        setOpen(false);
        if (onApply) onApply(); // Close the parent popover
    };

    const handleClear = () => {
        column?.setFilterValue(undefined);
        setDate(undefined);
        setOpen(false);
        if (onApply) onApply(); // Also close parent on clear
    };
    
    const handleAllBefore = () => {
        if (!date?.from) return;
        const newDate = { from: undefined, to: new Date(date.from) };
        applyFilter(newDate);
    };

    const handleAllAfter = () => {
        if (!date?.from) return;
        const newDate = { from: new Date(date.from), to: undefined };
        applyFilter(newDate);
    };

    const isOneDaySelected = date?.from && !date.to;

    return (
        <div className={cn("grid gap-2")}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[210px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>{date.from.toLocaleDateString()} - {date.to.toLocaleDateString()}</>
                            ) : (
                                <>{date.from.toLocaleDateString()}</>
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    <Separator />
                    <div className="p-2 flex justify-end space-x-2">
                        {isOneDaySelected && (
                           <div className='mr-auto flex space-x-2'>
                             <Button onClick={handleAllBefore} variant="ghost">All time before</Button>
                             <Button onClick={handleAllAfter} variant="ghost">All time after</Button>
                           </div>
                        )}
                        <Button onClick={handleClear} variant="ghost">Clear</Button>
                        <Button onClick={() => applyFilter(date)}>Apply</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
