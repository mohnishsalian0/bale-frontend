"use client";

import * as React from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconCalendarEvent, IconX } from "@tabler/icons-react";

interface DateRangePickerProps extends React.ComponentProps<"div"> {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <div className="flex items-center h-10 border border-gray-300 rounded-md">
          <PopoverTrigger asChild>
            <button
              id="date"
              className={cn(
                "flex items-center justify-start text-sm text-gray-700 text-left text-nowrap font-normal px-3 hover:bg-gray-100 hover:cursor-pointer h-full",
                !date && "text-muted-foreground",
              )}
            >
              <IconCalendarEvent className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </button>
          </PopoverTrigger>
          {date && (
            <button
              onClick={() => onDateChange && onDateChange(undefined)}
              className="h-full px-3 hover:bg-gray-100 hover:cursor-pointer"
            >
              <IconX className="size-4 text-gray-500" />
            </button>
          )}
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
