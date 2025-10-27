"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { IconCalendarEvent } from "@tabler/icons-react"
import { Input } from "./input"

interface DatePickerProps {
	label?: string
	placeholder?: string
	value?: Date
	onChange?: (date: Date | undefined) => void
	required?: boolean
	className?: string
}

export function DatePicker({
	label,
	placeholder = "Select date",
	value,
	onChange,
	required = false,
	className,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false)

	// Format date for display (DD-MM-YYYY) using useMemo
	const displayValue = React.useMemo(() => {
		if (!value) return ''
		const year = value.getFullYear()
		const month = String(value.getMonth() + 1).padStart(2, '0')
		const day = String(value.getDate()).padStart(2, '0')
		return `${day}-${month}-${year}`
	}, [value])

	return (
		<div className={`flex flex-col gap-1 ${className || ''}`}>
			{label && (
				<Label htmlFor="date-picker" className="px-1">
					{label}
				</Label>
			)}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<div className="relative">
						<Input
							id="date-picker"
							type="text"
							value={displayValue}
							placeholder={placeholder}
							className="pr-12"
							readOnly
							required={required}
						/>
						<Button
							type="button"
							variant='ghost'
							size='icon'
							className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:bg-transparent"
						>
							<IconCalendarEvent className="size-5" />
						</Button>
					</div>
				</PopoverTrigger>
				<PopoverContent
					className="w-auto p-1"
					align="start"
				>
					<Calendar
						mode="single"
						selected={value}
						captionLayout="dropdown"
						onSelect={(date) => {
							if (onChange) {
								onChange(date)
							}
							setOpen(false)
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
